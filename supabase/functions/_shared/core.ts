// Helpers partagés pour l'API Core by Carlo.
// Utilisé par les Edge Functions core-*. Aucune valeur secrète en dur : tout via secrets.
//
// Secrets attendus (supabase secrets set) :
//   CORE_EMAIL, CORE_PASSWORD, CORE_API_KEY
//   CORE_API_BASE   (obligatoire, sans valeur par défaut — voir ci-dessous)
//   CORE_AUTH_BASE  (obligatoire, sans valeur par défaut — voir ci-dessous)
//   SITE_URL
//
// Les tarifs ne viennent PLUS des secrets CORE_PRICE_* : ils sont lus dans la
// table `app_pricing` (migration-pricing.sql), source unique du montant affiché
// et du montant prélevé. Voir loadPricing() en bas de ce fichier.

// v1.21.3 — le repli silencieux sur le sandbox est supprimé.
// Auparavant : `Deno.env.get("CORE_API_BASE") ?? "https://sandbox-api…"`.
// Un secret mal orthographié, oublié sur une fonction, ou effacé par un
// `secrets set` partiel ne levait rien : la fonction repartait en sandbox. Les
// prélèvements « réussissaient », les callbacks activaient les abonnements, les
// clients utilisaient le produit — et aucun euro n'était encaissé. Silencieux
// des deux côtés. Un environnement de paiement ne se devine pas.
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) {
    throw new Error(
      `Secret ${name} absent. Aucun repli sur le sandbox n'est prévu : un ` +
      `environnement de paiement ne se devine pas. Poser le secret, puis ` +
      `REDÉPLOYER la fonction — les valeurs sont lues à l'import du module, ` +
      `une instance déjà chaude conserverait l'ancienne.`,
    );
  }
  return v;
}

const API_BASE = requireEnv("CORE_API_BASE");
const AUTH_BASE = requireEnv("CORE_AUTH_BASE");

// Cache du token au niveau du module : réutilisé tant que l'instance de la fonction
// reste « chaude ». Le token Core est valide 90 jours ; on le rafraîchit bien avant.
let cachedToken: string | null = null;
let cachedExpiry = 0; // timestamp ms

export async function coreLogin(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry - 60_000) return cachedToken;

  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: Deno.env.get("CORE_EMAIL"),
      password: Deno.env.get("CORE_PASSWORD"),
      apiKey: Deno.env.get("CORE_API_KEY"),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Core login failed (${res.status}): ${txt}`);
  }
  const data = await res.json();
  cachedToken = data.token;
  // expiresIn est en secondes (90 jours). On garde une marge : re-login au bout de ~24h
  // pour éviter tout token périmé sur une instance très longue.
  cachedExpiry = now + Math.min((data.expiresIn ?? 3600) * 1000, 24 * 3600 * 1000);
  return cachedToken!;
}

// Appel authentifié à l'API Core (endpoints /partner/*).
export async function coreFetch(path: string, init: RequestInit = {}) {
  const token = await coreLogin();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  return res;
}

// ---------------------------------------------------------------------------
// Carte en attente — v1.23.1 (migration-pending-card.sql)
//
// `core-register-card` n'écrit plus dans `core_card_id` : la carte n'existe
// pour nous qu'une fois le client revenu par l'URL de succès de Core. Cette
// fonction la promeut alors, côté serveur, pour le seul compte authentifié.
//
// Garde-fou : la carte doit être connue de Core (GET /cards/{id} en 2xx). On ne
// suppose AUCUN champ de validation dans la réponse — la documentation n'est
// pas consultable depuis l'environnement de développement, et un champ
// présumé serait une conjecture. Un retour `?card=saved` forgé à la main ne
// peut promouvoir que la carte en attente du compte qui le forge.
//
// L'ancienne carte, s'il y en avait une différente, est supprimée chez Core
// (au mieux) : on ne conserve pas un moyen de paiement devenu sans usage.
//
// Renvoie { promoted, cardId, period } ou { error }.
// ---------------------------------------------------------------------------
export async function promotePendingCard(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
): Promise<{ promoted: boolean; cardId?: string | null; period?: string | null; error?: string }> {
  const { data: p, error } = await supabase.from("profiles")
    .select("core_card_id, plan_period, pending_card_id, pending_plan_period")
    .eq("id", userId).single();
  if (error || !p) return { promoted: false, error: "Profil introuvable" };
  if (!p.pending_card_id) {
    return { promoted: false, cardId: p.core_card_id, period: p.plan_period };
  }

  const check = await coreFetch(`/cards/${p.pending_card_id}`, { method: "GET" });
  if (!check.ok) {
    // Carte inconnue de Core : on l'oublie, la carte en service est conservée.
    await supabase.from("profiles")
      .update({ pending_card_id: null, pending_plan_period: null }).eq("id", userId);
    return { promoted: false, error: "Carte non reconnue par le prestataire de paiement" };
  }

  const period = p.pending_plan_period === "annual" ? "annual" : "monthly";
  const { error: upErr } = await supabase.from("profiles").update({
    core_card_id: p.pending_card_id,
    plan_period: period,
    pending_card_id: null,
    pending_plan_period: null,
  }).eq("id", userId);
  if (upErr) return { promoted: false, error: "Enregistrement de la carte impossible" };

  if (p.core_card_id && p.core_card_id !== p.pending_card_id) {
    try { await coreFetch(`/cards/${p.core_card_id}`, { method: "DELETE" }); } catch (_e) { /* au mieux */ }
  }
  return { promoted: true, cardId: p.pending_card_id, period };
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Tarifs — v1.21.3
//
// Remplace planAmount(), qui lisait les secrets CORE_PRICE_*. Deux sources
// indépendantes coexistaient : le montant prélevé venait des secrets, le montant
// affiché était écrit en dur dans `shared/i18n.js` et dans `templates.ts`. Rien
// ne les comparait. La table `app_pricing` est désormais la seule source.
//
// Montants en EUROS, décimaux (9.90) — convention de l'API Core, jamais des
// centimes.
//
// Cette fonction LÈVE plutôt que de renvoyer 0. Un tarif absent est une erreur
// de configuration qui concerne tous les clients, pas un cas à ignorer : c'est
// précisément le `skipped` silencieux de core-renew qui laissait un compte
// `active` indéfiniment sans jamais payer.
export type Pricing = { monthly: number; annual: number };

export async function loadPricing(
  supabase: { from: (t: string) => any },
  plan = "individual",
): Promise<Pricing> {
  const { data, error } = await supabase
    .from("app_pricing")
    .select("period, amount_eur")
    .eq("plan", plan);

  if (error) {
    throw new Error(
      `Lecture de app_pricing impossible (plan '${plan}') : ${error.message}. ` +
      `La migration migration-pricing.sql a-t-elle été exécutée ?`,
    );
  }

  const trouve: Record<string, number> = {};
  for (const row of data ?? []) trouve[row.period] = Number(row.amount_eur);

  for (const p of ["monthly", "annual"]) {
    if (!(trouve[p] > 0)) {
      throw new Error(
        `Tarif '${p}' du plan '${plan}' absent ou nul dans app_pricing. ` +
        `Aucun prélèvement n'est tenté tant que les tarifs ne sont pas configurés.`,
      );
    }
  }
  return { monthly: trouve.monthly, annual: trouve.annual };
}

// Sélectionne le montant d'une période dans un jeu de tarifs déjà chargé.
export function amountFor(pricing: Pricing, period: string): number {
  return period === "annual" ? pricing.annual : pricing.monthly;
}
