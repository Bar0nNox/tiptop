// Edge Function : core-register-card
// Lance l'enregistrement d'une carte pour l'utilisateur connecté.
// Renvoie l'URL de la page hébergée Core où le client saisit sa carte.
//
// Flux : le client clique « S'abonner » → choisit mensuel/annuel → cette fonction
// crée une session d'enregistrement de carte chez Core → renvoie paymentPageUrl →
// le frontend redirige le client vers cette page. À son retour (successUrl), le
// frontend appellera core-charge pour le premier prélèvement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { coreFetch, CORS } from "../_shared/core.ts";
// (La promotion de la carte en attente vit dans ../_shared/core.ts.)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // --- Authentifier l'utilisateur via son JWT Supabase ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) {
      return json({ error: "Non authentifié" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const period = body.period === "annual" ? "annual" : "monthly";

    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    // Au retour, on transmet la période choisie pour déclencher le bon prélèvement.
    const successUrl = `${siteUrl}/dashboard.html?card=saved&plan=${period}`;
    const failedUrl = `${siteUrl}/dashboard.html?card=error`;

    // --- Créer la session d'enregistrement de carte chez Core ---
    const res = await coreFetch("/cards/register", {
      method: "POST",
      body: JSON.stringify({
        successUrl,
        failedUrl,
        metadata: { customerEmail: user.email },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data.message ?? "Échec Core", detail: data }, 502);
    }

    // v1.23.1 — la carte est mise EN ATTENTE, pas en service. Jusqu'ici elle
    // remplaçait `core_card_id` (et la périodicité `plan_period`) dès cette
    // étape, avant toute saisie : un client qui abandonnait la page laissait une
    // carte jamais validée que `core-renew` tentait ensuite de prélever, et
    // perdait la précédente. La promotion a lieu au retour par l'URL de succès
    // (promotePendingCard, dans core-charge ou account-actions).
    const { error: upErr } = await supabase.from("profiles")
      .update({ pending_card_id: String(data.cardId), pending_plan_period: period })
      .eq("id", user.id);
    if (upErr) {
      console.error("core-register-card — carte en attente :", upErr);
      return json({ error: "Enregistrement de la carte impossible" }, 500);
    }

    return json({ paymentPageUrl: data.paymentPageUrl, cardId: data.cardId });
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
