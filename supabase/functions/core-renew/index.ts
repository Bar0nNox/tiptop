// Edge Function : core-renew
// Prélève les échéances arrivées à terme. Appelée par une tâche planifiée (pg_cron),
// pas par un navigateur.
//
// Traite deux cas avec la même mécanique :
//   - fin d'essai   (trialing, current_period_end atteint) → 1er prélèvement réel
//   - renouvellement (active/past_due, échéance atteinte)  → prélèvement suivant
//
// SÉCURITÉ : déployée sans vérification de JWT (l'ordonnanceur n'a pas de session
// utilisateur), elle est protégée par un secret partagé envoyé dans l'en-tête
// x-cron-secret. Sans ce secret, aucun traitement — sinon n'importe qui pourrait
// déclencher des prélèvements en masse.
//
// L'activation définitive reste confirmée par le callback Core (source de vérité) ;
// ici on initie le prélèvement et on met à jour l'état de suivi.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { coreFetch, CORS, planAmount } from "../_shared/core.ts";

const MAX_ATTEMPTS = 3;      // tentatives avant abandon
const RETRY_DAYS = 1;        // délai avant nouvelle tentative
const BATCH_SIZE = 50;       // profils traités par exécution

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // --- Contrôle du secret partagé ---
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return json({ error: "Non autorisé" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase.from("profiles")
    .select("id, email, core_card_id, plan_period, subscription_status, current_period_end, renewal_attempts")
    .in("subscription_status", ["trialing", "active", "past_due"])
    .lte("current_period_end", nowIso)
    .limit(BATCH_SIZE);

  if (error) return json({ error: "Lecture des échéances impossible" }, 500);

  const results: Record<string, unknown>[] = [];

  for (const p of due ?? []) {
    // Sans carte enregistrée, aucun prélèvement possible.
    // Cas normal en fin d'essai (la carte n'est pas demandée à l'inscription) :
    // l'essai se termine simplement, le client pourra s'abonner quand il le souhaite.
    if (!p.core_card_id) {
      const ended = p.subscription_status === "trialing" ? "inactive" : "canceled";
      await supabase.from("profiles")
        .update({ subscription_status: ended, renewal_attempts: 0 }).eq("id", p.id);
      results.push({ user: p.id, action: ended, reason: "no_card" });
      continue;
    }

    const period = p.plan_period === "annual" ? "annual" : "monthly";
    const amount = planAmount(period);
    if (!(amount > 0)) {
      results.push({ user: p.id, action: "skipped", reason: "amount_not_configured" });
      continue;
    }

    const orderReference = `${p.id}_${period}_${Date.now()}`;
    const siteUrl = Deno.env.get("SITE_URL") ?? "";

    let ok = false;
    let txId: string | null = null;
    try {
      const res = await coreFetch("/transactions/rebill", {
        method: "POST",
        body: JSON.stringify({
          amount,
          cardId: Number(p.core_card_id),
          successUrl: `${siteUrl}/dashboard.html?paid=1`,
          failedUrl: `${siteUrl}/dashboard.html?paid=0`,
          orderReference,
          description: `Abonnement TipTop — ${period === "annual" ? "annuel" : "mensuel"}`,
          metadata: { customerEmail: p.email },
        }),
      });
      const data = await res.json();
      txId = data?.id ? String(data.id) : null;
      ok = res.ok && (data?.status === "COMPLETED" || data?.status === "PENDING");

      await supabase.from("payments").insert({
        user_id: p.id,
        core_transaction_id: txId,
        order_reference: orderReference,
        amount,
        plan_period: period,
        status: data?.status ?? (res.ok ? "PENDING" : "FAILED"),
      });
    } catch (_e) {
      ok = false;
    }

    if (ok) {
      // Prochaine échéance. Le callback confirmera le statut définitif ; on avance
      // la période dès maintenant pour ne pas re-prélever à la prochaine exécution.
      const end = new Date();
      if (period === "annual") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);

      await supabase.from("profiles").update({
        subscription_status: "active",
        current_period_end: end.toISOString(),
        renewal_attempts: 0,
      }).eq("id", p.id);
      results.push({ user: p.id, action: "charged", transaction: txId });
    } else {
      const attempts = (p.renewal_attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await supabase.from("profiles").update({
          subscription_status: "canceled",
          renewal_attempts: attempts,
        }).eq("id", p.id);
        results.push({ user: p.id, action: "canceled", reason: "max_attempts" });
      } else {
        const retry = new Date();
        retry.setDate(retry.getDate() + RETRY_DAYS);
        await supabase.from("profiles").update({
          subscription_status: "past_due",
          current_period_end: retry.toISOString(),
          renewal_attempts: attempts,
        }).eq("id", p.id);
        results.push({ user: p.id, action: "retry_scheduled", attempt: attempts });
      }
    }
  }

  return json({ processed: results.length, results });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
