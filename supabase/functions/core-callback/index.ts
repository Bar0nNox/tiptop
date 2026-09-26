// Edge Function : core-callback
// Reçoit les notifications (webhooks) de Core after chaque paiement.
//
// SÉCURITÉ — IMPORTANT : la doc Core n'expose PAS de signature de vérification des
// callbacks. On ne fait donc JAMAIS confiance au corps reçu tel quel : on re-vérifie
// chaque transaction en appelant GET /transactions/{id} côté serveur avant d'activer
// un abonnement. Sans cela, n'importe qui connaissant l'URL pourrait simuler un
// « paiement réussi ».
//
// Idempotence : un même événement peut arriver plusieurs fois. On s'appuie sur
// order_reference (unique) et core_transaction_id pour ne traiter qu'une fois.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { coreFetch, CORS } from "../_shared/core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Toujours répondre vite (Core attend un 200 rapide). On traite puis on répond.
  try {
    const payload = await req.json().catch(() => null);
    const txId = payload?.transaction?.id;
    if (!txId) return ok(); // rien d'exploitable, on acquitte quand même

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- VÉRIFICATION indépendante du statut réel (ne pas croire le corps reçu) ---
    const verifyRes = await coreFetch(`/transactions/${txId}`, { method: "GET" });
    if (!verifyRes.ok) return ok(); // impossible de vérifier → on n'active rien
    const tx = await verifyRes.json();

    const status = tx.status; // COMPLETED | FAILED | CANCELLED | PENDING
    // La référence de commande apparaît sous plusieurs noms selon les endpoints :
    // `orderReference` (requête de prélèvement) et `externalId` (payload de callback
    // et réponse GET /transactions/{id}). On accepte les deux.
    const orderReference = tx.orderReference ?? tx.externalId ?? tx.metadata?.orderReference ?? null;

    // Retrouver la ligne de paiement (créée par core-charge) pour l'idempotence.
    let paymentRow = null;
    if (orderReference) {
      const { data } = await supabase.from("payments")
        .select("*").eq("order_reference", orderReference).maybeSingle();
      paymentRow = data;
    }
    if (!paymentRow) {
      const { data } = await supabase.from("payments")
        .select("*").eq("core_transaction_id", String(txId)).maybeSingle();
      paymentRow = data;
    }

    // Idempotence : déjà traité en COMPLETED → ne rien refaire.
    if (paymentRow && paymentRow.status === "COMPLETED" && status === "COMPLETED") {
      return ok();
    }

    // Mettre à jour le statut du paiement.
    if (paymentRow) {
      await supabase.from("payments").update({
        status, updated_at: new Date().toISOString(),
      }).eq("id", paymentRow.id);
    }

    // Déterminer l'utilisateur et la période : d'abord via la ligne de paiement,
    // sinon en décodant l'order_reference (`userId:period:timestamp`).
    let userId = paymentRow?.user_id ?? null;
    let period = paymentRow?.plan_period ?? null;
    if ((!userId || !period) && orderReference) {
      // Format actuel : `userId_period_timestamp` ; ancien format : `userId:period:timestamp`.
      const parts = String(orderReference).split(/[_:]/);
      if (parts.length >= 2) { userId = userId ?? parts[0]; period = period ?? parts[1]; }
    }

    if (status === "COMPLETED" && userId) {
      const end = new Date();
      if (period === "annual") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      await supabase.from("profiles").update({
        subscription_status: "active",
        plan_period: period ?? "monthly",
        current_period_end: end.toISOString(),
      }).eq("id", userId);
    } else if (status === "CANCELLED" && paymentRow?.status === "COMPLETED" && paymentRow.user_id) {
      // v1.22.0 — Remboursement d'une transaction ENCAISSÉE : l'accès est clos
      // immédiatement (décision du 26/09/2026, §5.5 du roadmap).
      //
      // Jusqu'ici cette branche était un no-op : la ligne `payments` passait en
      // CANCELLED, le profil restait `active` jusqu'à l'échéance — le client
      // était remboursé ET conservait son accès, sans que rien ne le signale.
      //
      // Trois conditions, toutes lues dans NOTRE base et non dans le corps reçu :
      //   · le statut CANCELLED vient de la vérification GET ci-dessus ;
      //   · l'état antérieur COMPLETED est celui de notre ligne `payments` —
      //     un premier paiement échoué ou annulé avant encaissement (PENDING →
      //     CANCELLED) ne rétrograde rien, comme avant ;
      //   · l'utilisateur est celui de la ligne, jamais celui décodé depuis
      //     `orderReference`.
      // Un rejeu du même callback trouve la ligne déjà en CANCELLED et ne
      // repasse pas ici.
      //
      // Seul le remboursement du DERNIER paiement encaissé clôt l'accès : si un
      // renouvellement plus récent a abouti, la période en cours est payée par
      // lui, et rembourser une période passée n'y touche pas.
      const { count: plusRecents } = await supabase.from("payments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", paymentRow.user_id)
        .eq("status", "COMPLETED")
        .gt("created_at", paymentRow.created_at);
      if ((plusRecents ?? 0) === 0) {
        const { error: upErr } = await supabase.from("profiles").update({
          subscription_status: "inactive",
          current_period_end: new Date().toISOString(),
          renewal_attempts: 0,
        }).eq("id", paymentRow.user_id);
        if (upErr) console.error("core-callback — clôture après remboursement :", upErr);
        else console.log("core-callback — remboursement : accès clos", paymentRow.user_id, txId);
      } else {
        console.log("core-callback — remboursement d'une période antérieure, accès maintenu", txId);
      }
    }
    // FAILED, ou CANCELLED d'un paiement jamais encaissé : on laisse l'abonnement
    // en l'état (pas de rétrogradation brutale si l'abonnement était déjà actif —
    // le cron de renouvellement gère les échecs de renouvellement séparément).

    return ok();
  } catch (_e) {
    // On acquitte quand même pour éviter que Core ne renvoie en boucle ;
    // les erreurs réelles sont visibles dans les logs de la fonction.
    return ok();
  }
});

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
