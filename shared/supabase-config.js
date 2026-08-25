/* =========================================================================
   Configuration Supabase — renseignée pour le projet TipTop.
   Console Supabase > Project Settings > API.
   La clé publishable (sb_publishable_...) est publique par conception : la
   sécurité est assurée par les policies Row Level Security côté base de
   données, pas par le secret de cette clé.
   ========================================================================= */
window.SUPABASE_URL = "https://jlvzpqfafaubxphojoqg.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_ksQnielVv9e-K6PuE8wlDg_T1btSw4s";

window.getSupabaseClient = function () {
  if (!window._sbClient) {
    window._sbClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  return window._sbClient;
};

/* Redirige vers la connexion si aucune session active. Retourne la session sinon. */
window.requireAuth = async function () {
  const sb = window.getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.href = "auth.html?next=" + encodeURIComponent(location.pathname + location.search);
    return null;
  }
  return session;
};

/* Récupère le profil (statut d'abonnement inclus) de l'utilisateur connecté. */
window.fetchProfile = async function (userId) {
  const sb = window.getSupabaseClient();
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).single();
  if (error) { console.warn("fetchProfile:", error); return null; }
  return data;
};

/* ---------------------------------------------------------------------------
   Tarifs — v1.21.3

   Le prix affiché et le montant prélevé n'avaient aucune source commune : les
   montants étaient écrits en dur dans `i18n.js` (6 clés × 2 langues) tandis que
   le débit venait des secrets CORE_PRICE_*. Un tarif changé d'un côté et pas de
   l'autre donnait un client qui voit un prix et en paie un autre.

   La table `app_pricing` est désormais la source unique, lue ici par le
   navigateur et par les Edge Functions. Lecture seule côté client (cf.
   migration-pricing.sql) : cette table détermine le montant prélevé.

   Aucun repli sur une valeur en dur en cas d'échec. Ce serait rétablir la
   divergence, en pire — muette et permanente. L'appelant doit refuser
   d'afficher un prix plutôt que d'en inventer un.
   --------------------------------------------------------------------------- */
window.fetchPricing = async function (plan) {
  const sb = window.getSupabaseClient();
  const { data, error } = await sb.from("app_pricing")
    .select("period, amount_eur").eq("plan", plan || "individual");
  if (error) { console.warn("fetchPricing:", error); return null; }

  const out = {};
  (data || []).forEach(function (row) { out[row.period] = Number(row.amount_eur); });
  if (!(out.monthly > 0) || !(out.annual > 0)) {
    console.warn("fetchPricing: tarif absent ou nul", out);
    return null;
  }
  return out;
};

/* Met en forme un montant en euros selon la langue courante.
   Le nombre brut est stocké en base et formaté ici : « 9,90 € » en français,
   « €9.90 » en anglais. Concaténer une chaîne déjà formatée ne produirait pas
   les deux. */
window.formatAmount = function (amount) {
  const lang = (window.getLang && window.getLang()) === "fr" ? "fr-FR" : "en-GB";
  return new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(amount);
};
