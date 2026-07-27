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
