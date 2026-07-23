// Edge Function : core-charge
// Déclenche un prélèvement (MIT) sur la carte enregistrée de l'utilisateur connecté.
// Utilisé pour le PREMIER paiement, juste après l'enregistrement de la carte.
// (Le renouvellement automatique mensuel/annuel sera assuré plus tard par une tâche
//  planifiée qui appellera la même logique de prélèvement.)
//
// L'activation de l'abonnement n'est PAS faite ici : elle est confirmée par le
// callback Core (source de vérité). Ici on initie le prélèvement et on enregistre
// une ligne 'PENDING' dans payments.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { coreFetch, CORS, planAmount } from "../_shared/core.ts";

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

    // Récupérer la carte enregistrée et la période choisie.
    const { data: profile } = await supabase.from("profiles")
      .select("core_card_id, plan_period").eq("id", user.id).single();
    if (!profile?.core_card_id) {
      return json({ error: "Aucune carte enregistrée" }, 400);
    }
    const period = profile.plan_period === "annual" ? "annual" : "monthly";
    const amount = planAmount(period);
    if (!(amount > 0)) {
      return json({ error: "Montant d'abonnement non configuré (CORE_PRICE_*)" }, 500);
    }

    // Référence unique pour idempotence et suivi. Encode l'utilisateur et la période.
    // Séparateur `_` (et non `:`) : l'UUID contient des tirets, et certains systèmes
    // restreignent les caractères de la référence externe (cf. exemple « ORDER-12345 »).
    const orderReference = `${user.id}_${period}_${Date.now()}`;
    const siteUrl = Deno.env.get("SITE_URL") ?? "";

    const res = await coreFetch("/transactions/rebill", {
      method: "POST",
      body: JSON.stringify({
        amount,
        cardId: Number(profile.core_card_id),
        successUrl: `${siteUrl}/dashboard.html?paid=1`,
        failedUrl: `${siteUrl}/dashboard.html?paid=0`,
        orderReference,
        description: `Abonnement TipTop — ${period === "annual" ? "annuel" : "mensuel"}`,
        metadata: { customerEmail: user.email },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data.message ?? "Échec du prélèvement", detail: data }, 502);
    }

    // Enregistrer le paiement (idempotence côté callback via order_reference / tx id).
    await supabase.from("payments").insert({
      user_id: user.id,
      core_transaction_id: String(data.id),
      order_reference: orderReference,
      amount,
      plan_period: period,
      status: data.status ?? "PENDING",
    });

    // Si Core confirme immédiatement (COMPLETED, paymentPageUrl null), on peut activer
    // sans attendre — le callback confirmera de façon idempotente.
    if (data.status === "COMPLETED" && !data.paymentPageUrl) {
      await activateSubscription(supabase, user.id, period);
    }

    return json({
      status: data.status,
      paymentPageUrl: data.paymentPageUrl ?? null, // non-null → validation client requise
      transactionId: data.id,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function activateSubscription(supabase: any, userId: string, period: string) {
  const end = new Date();
  if (period === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  await supabase.from("profiles").update({
    subscription_status: "active",
    plan_period: period,
    current_period_end: end.toISOString(),
  }).eq("id", userId);
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
