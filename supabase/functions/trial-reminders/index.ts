// ============================================================================
// TipTop — trial-reminders/index.ts                   (v1.19.0)
//
// Appelée une fois par jour par pg_cron (08:00 UTC, cf. cron-trial-reminders.sql).
// Envoie les relances de fin d'essai via l'API HTTP de Resend.
//
// Cette API est distincte du SMTP configuré dans Supabase Auth : celui-ci ne
// sert qu'aux e-mails d'authentification, gérés par Supabase. Les relances sont
// nos propres envois et exigent une clé API.
//
// SÉCURITÉ : comme `core-renew`, déployée SANS vérification de JWT
// (l'ordonnanceur n'a pas de session utilisateur) et protégée par le secret
// partagé `x-cron-secret`. Sans ce secret, aucun traitement — sinon n'importe
// qui pourrait déclencher des envois en masse depuis l'extérieur.
//     supabase functions deploy trial-reminders --no-verify-jwt
//
// SECRETS REQUIS (Supabase > Edge Functions > Secrets)
//   CRON_SECRET        déjà défini pour `core-renew` — même valeur.
//   RESEND_API_KEY     clé Resend, permission « Sending access » UNIQUEMENT.
//                      Ne pas réutiliser la clé « Supabase Key » en Full
//                      access : moindre privilège, et surtout révocabilité —
//                      révoquer la clé des relances ne doit pas couper les
//                      e-mails d'authentification.
//   RESEND_FROM        (optionnel) expéditeur. Défaut : TipTop <hello@tiptopplans.com>
//   RESEND_REPLY_TO    (optionnel) adresse de réponse. Plusieurs relances
//                      invitent explicitement à répondre : sans cela, les
//                      réponses tombent dans le vide.
//
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.
//
// La sélection des destinataires est entièrement en SQL
// (`trial_reminder_targets()`). Ce fichier n'a qu'un rôle d'expéditeur.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadPricing } from "../_shared/core.ts";
import {
  renderReminder,
  templatePlaceholders,
  APP_URL,
  type Kind,
  type Lang,
  type Variant,
} from "./templates.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend limite à 2 requêtes par seconde sur les offres courantes. 600 ms de
// pause laissent une marge. Les volumes sont faibles : quelques dizaines
// d'envois par jour au plus.
const SEND_INTERVAL_MS = 600;

type Target = {
  user_id: string;
  email: string;
  lang: Lang;
  kind: Kind;
  variant: Variant;
  unsubscribe_token: string;
  period_end: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // -------------------------------------------------------------------------
  // Authentification — secret partagé, à l'identique de `core-renew`.
  // -------------------------------------------------------------------------
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "Non autorisé" }, 401);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!serviceKey || !supabaseUrl) {
    console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de l'environnement.");
    return json({ error: "configuration incomplète" }, 500);
  }
  if (!resendKey) {
    console.error("RESEND_API_KEY absent. Créer le secret avant d'activer le cron.");
    return json({ error: "RESEND_API_KEY absent" }, 500);
  }

  // Garde-fou de gabarit. `POSTAL_ADDRESS` et `AFTER_EXPIRY` sont livrés en
  // placeholder ; partis tels quels ils enverraient à de vrais clients une
  // adresse factice et une description fausse de ce qui les attend après
  // l'échéance. Rien ici ne lèverait d'erreur — exactement le mode de défaut
  // décrit au §7 du roadmap. On échoue donc explicitement.
  const unresolved = templatePlaceholders();
  if (unresolved.length > 0) {
    console.error("Gabarits non finalisés :", unresolved.join(", "));
    return json({ error: "gabarits non finalisés", unresolved }, 409);
  }

  const from = Deno.env.get("RESEND_FROM") ?? "TipTop <hello@tiptopplans.com>";
  const replyTo = Deno.env.get("RESEND_REPLY_TO") ?? undefined;

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // v1.21.3 — tarifs lus dans app_pricing, comme core-charge et core-renew.
  // Même raisonnement que le garde-fou de gabarit ci-dessus : mieux vaut un
  // échec dans les logs qu'un e-mail annonçant un prix faux à un client qu'on
  // cherche à convertir. loadPricing() lève si un tarif manque.
  let pricing;
  try {
    pricing = await loadPricing(db);
  } catch (e) {
    console.error("Tarifs non configurés :", e);
    return json({ error: "tarifs non configurés", detail: String(e) }, 500);
  }

  // -------------------------------------------------------------------------
  // Destinataires du jour
  // -------------------------------------------------------------------------
  const { data, error } = await db.rpc("trial_reminder_targets");
  if (error) {
    console.error("trial_reminder_targets a échoué :", error.message);
    return json({ error: error.message }, 500);
  }

  const targets = (data ?? []) as Target[];
  const report = {
    considered: targets.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    aborted: false as boolean | string,
    detail: [] as Array<Record<string, unknown>>,
  };

  if (targets.length === 0) {
    console.log("Aucune relance à envoyer aujourd'hui.");
    return json(report);
  }

  for (const [i, t] of targets.entries()) {
    if (i > 0) await sleep(SEND_INTERVAL_MS);

    // Lien du pied d'e-mail : page statique, qui demande confirmation. Un GET
    // ne doit pas désabonner — les scanners de sécurité et certains clients de
    // messagerie ouvrent les liens, et désabonneraient des gens à leur insu.
    const unsubscribePage =
      `${APP_URL}/unsubscribe.html?t=${encodeURIComponent(t.unsubscribe_token)}&lang=${t.lang}`;
    // Désabonnement en un clic (RFC 8058), utilisé par Gmail et Apple Mail :
    // POST direct sur la fonction, sans authentification.
    const unsubscribeOneClick =
      `${supabaseUrl}/functions/v1/unsubscribe?t=${encodeURIComponent(t.unsubscribe_token)}`;

    // ---------------------------------------------------------------------
    // Réservation avant envoi
    //
    // L'insertion précède l'appel à Resend. La contrainte unique
    // (user_id, kind) fait donc office de verrou : deux exécutions
    // simultanées, ou un rejeu du cron dans la journée, se heurtent à un
    // conflit au lieu d'envoyer deux fois. En cas d'échec d'envoi, la ligne
    // est retirée et la relance repartira demain.
    // ---------------------------------------------------------------------
    const { data: claim, error: claimError } = await db
      .from("trial_emails")
      .insert({ user_id: t.user_id, kind: t.kind, variant: t.variant, lang: t.lang })
      .select("id")
      .single();

    if (claimError) {
      // 23505 = violation d'unicité : déjà envoyé. Cas normal, pas une erreur.
      const duplicate = (claimError as { code?: string }).code === "23505";
      report.skipped++;
      report.detail.push({
        user_id: t.user_id,
        kind: t.kind,
        status: duplicate ? "déjà envoyé" : `réservation refusée : ${claimError.message}`,
      });
      if (!duplicate) console.error("Réservation refusée :", claimError.message);
      continue;
    }

    const { subject, html, text } = renderReminder({
      kind: t.kind,
      variant: t.variant,
      lang: t.lang,
      periodEnd: t.period_end,
      unsubscribeUrl: unsubscribePage,
      pricing,
    });

    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          // Clé d'idempotence côté Resend, en complément de la nôtre.
          "Idempotency-Key": `trial-${t.kind}-${t.user_id}`,
        },
        body: JSON.stringify({
          from,
          to: [t.email],
          subject,
          html,
          text,
          ...(replyTo ? { reply_to: replyTo } : {}),
          headers: {
            "List-Unsubscribe": `<${unsubscribeOneClick}>, <${unsubscribePage}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "category", value: "trial-reminder" },
            { name: "kind", value: t.kind },
            { name: "variant", value: t.variant },
          ],
        }),
      });
    } catch (e) {
      await db.from("trial_emails").delete().eq("id", claim.id);
      report.failed++;
      report.detail.push({ user_id: t.user_id, kind: t.kind, status: `réseau : ${String(e)}` });
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      // La réservation est retirée pour que la relance reparte demain.
      await db.from("trial_emails").delete().eq("id", claim.id);
      report.failed++;
      report.detail.push({
        user_id: t.user_id,
        kind: t.kind,
        status: `Resend ${response.status}`,
        body: body.slice(0, 300),
      });
      console.error(`Resend ${response.status} pour ${t.kind} :`, body.slice(0, 300));

      // 429 : quota ou débit dépassé. Poursuivre ne ferait qu'aggraver — on
      // s'arrête, les réservations retirées repartiront demain.
      if (response.status === 429) {
        report.aborted = "429 Resend — interruption, reprise demain";
        break;
      }
      continue;
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    if (payload.id) {
      await db.from("trial_emails").update({ provider_id: payload.id }).eq("id", claim.id);
    }

    report.sent++;
    report.detail.push({ user_id: t.user_id, kind: t.kind, variant: t.variant, status: "envoyé" });
  }

  console.log(
    `Relances : ${report.sent} envoyées, ${report.skipped} ignorées, ${report.failed} en échec ` +
      `sur ${report.considered} candidats.`,
  );
  return json(report);
});
