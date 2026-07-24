// Edge Function : account-actions
// Actions de l'écran « Mon compte ». Une seule fonction, un paramètre `action` :
//
//   'card'   → détails de la carte enregistrée (masqués), lus chez Core
//   'cancel' → résiliation à effet différé : l'accès est maintenu jusqu'à la fin de
//              la période payée. La carte est supprimée chez Core immédiatement
//              (on ne conserve pas un moyen de paiement devenu sans usage).
//   'resume' → annule une résiliation tant que l'échéance n'est pas passée.
//              ⚠ nécessite de réenregistrer une carte, celle-ci ayant été supprimée.
//   'delete' → suppression définitive du compte. Résilie d'abord, supprime la carte,
//              puis supprime l'utilisateur (les événements suivent en cascade).
//
// Toutes les vérifications sont faites côté serveur : le navigateur ne fait que
// demander, il ne décide de rien.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { coreFetch, CORS } from "../_shared/core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Non authentifié" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const { data: profile } = await supabase.from("profiles")
      .select("core_card_id, plan_period, subscription_status, current_period_end, cancel_at_period_end")
      .eq("id", user.id).single();
    if (!profile) return json({ error: "Profil introuvable" }, 404);

    // ---- Détails de la carte enregistrée ----
    if (action === "card") {
      if (!profile.core_card_id) return json({ card: null });
      const res = await coreFetch(`/cards/${profile.core_card_id}`, { method: "GET" });
      if (!res.ok) return json({ card: null });
      const c = await res.json();
      return json({
        card: {
          maskedNumber: c.maskedNumber ?? null,
          cardType: c.cardType ?? null,
          expiryMonth: c.expiryMonth ?? null,
          expiryYear: c.expiryYear ?? null,
          validatedAt: c.validatedAt ?? null,
        },
      });
    }

    // ---- Résiliation à effet différé ----
    if (action === "cancel") {
      if (!["active", "past_due"].includes(profile.subscription_status)) {
        return json({ error: "Aucun abonnement à résilier" }, 409);
      }
      await deleteCoreCard(profile.core_card_id);
      const { error } = await supabase.from("profiles").update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        core_card_id: null,
      }).eq("id", user.id);
      if (error) return json({ error: "Résiliation impossible" }, 500);
      return json({ ok: true, accessUntil: profile.current_period_end });
    }

    // ---- Annulation de la résiliation ----
    if (action === "resume") {
      if (!profile.cancel_at_period_end) return json({ error: "Aucune résiliation en cours" }, 409);
      const { error } = await supabase.from("profiles").update({
        cancel_at_period_end: false,
        canceled_at: null,
      }).eq("id", user.id);
      if (error) return json({ error: "Réactivation impossible" }, 500);
      // La carte ayant été supprimée à la résiliation, un nouvel enregistrement est
      // nécessaire pour que le prélèvement suivant puisse aboutir.
      return json({ ok: true, cardRequired: true });
    }

    // ---- Suppression définitive du compte ----
    if (action === "delete") {
      // 1. Couper l'abonnement AVANT de supprimer, sinon la tâche planifiée
      //    tenterait de prélever un compte qui n'existe plus.
      await deleteCoreCard(profile.core_card_id);
      await supabase.from("profiles").update({
        subscription_status: "canceled",
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        core_card_id: null,
      }).eq("id", user.id);

      // 2. Supprimer l'utilisateur. Les événements, accès collaboratifs et le profil
      //    disparaissent en cascade (clés étrangères on delete cascade).
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) return json({ error: "Suppression du compte impossible" }, 500);
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);

    async function deleteCoreCard(cardId: string | null) {
      if (!cardId) return;
      try {
        await coreFetch(`/cards/${cardId}`, { method: "DELETE" });
      } catch (_e) {
        // Un échec côté Core ne doit pas bloquer la résiliation demandée par le
        // client ; la référence est de toute façon effacée de notre base.
      }
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
