// ============================================================================
// TipTop — unsubscribe/index.ts                       (v1.19.0)
//
// Désabonnement des relances de fin d'essai. Fonction PUBLIQUE : elle doit
// répondre sans session, un destinataire pouvant se désabonner sans être
// connecté — c'est d'ailleurs le principe même du procédé.
//
// ⚠️ DÉPLOIEMENT — la vérification de JWT doit être désactivée :
//     supabase functions deploy unsubscribe --no-verify-jwt
//   ou, dans `supabase/config.toml` :
//     [functions.unsubscribe]
//     verify_jwt = false
//   Sans cela, Gmail reçoit un 401 sur le désabonnement en un clic et peut
//   dégrader la réputation de l'expéditeur.
//
// Le seul pouvoir conféré par le jeton est de poser `trial_emails_opt_out`.
// Il ne donne accès à aucune donnée : la réponse est identique que le jeton
// existe ou non, afin de ne pas en faire un oracle d'existence de compte
// (même raisonnement que le parcours « mot de passe oublié », v1.14.0).
//
// DEUX MÉTHODES
//   POST  désabonne. Utilisé par l'en-tête `List-Unsubscribe-Post` (RFC 8058,
//         Gmail et Apple Mail) et par le bouton de `unsubscribe.html`.
//   GET   ne désabonne PAS : redirige vers la page de confirmation. Les
//         passerelles antispam et scanners de sécurité ouvrent les liens des
//         e-mails ; un GET actif désabonnerait des gens à leur insu.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const APP_URL = "https://tiptopplans.com";

const CORS = {
  // La page appelante est servie par OVH, la fonction par Supabase : origines
  // distinctes, CORS nécessaire.
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const lang = url.searchParams.get("lang") === "fr" ? "fr" : "en";

  // GET — aucune écriture, simple renvoi vers la page de confirmation.
  if (req.method === "GET") {
    const target =
      `${APP_URL}/unsubscribe.html?t=${encodeURIComponent(token)}&lang=${lang}`;
    return new Response(null, { status: 302, headers: { Location: target, ...CORS } });
  }

  if (req.method !== "POST") {
    return json({ error: "méthode non autorisée" }, 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    console.error("Environnement incomplet.");
    return json({ error: "configuration incomplète" }, 500);
  }

  // Jeton mal formé : réponse de succès malgré tout. Distinguer les cas
  // renseignerait un attaquant sur la validité d'un jeton.
  if (!UUID_RE.test(token)) {
    console.warn("Désabonnement : jeton mal formé.");
    return json({ ok: true }, 200);
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db
    .from("profiles")
    .update({ trial_emails_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id");

  if (error) {
    console.error("Désabonnement en échec :", error.message);
    // Un 500 sur un désabonnement en un clic est mal vu des messageries. On
    // journalise et on répond 200 ; l'incident est visible dans les logs.
    return json({ ok: true }, 200);
  }

  console.log(
    data && data.length > 0
      ? `Désabonnement enregistré (${data.length} profil).`
      : "Désabonnement : aucun profil pour ce jeton.",
  );
  return json({ ok: true }, 200);
});
