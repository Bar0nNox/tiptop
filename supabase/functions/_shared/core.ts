// Helpers partagés pour l'API Core by Carlo.
// Utilisé par les Edge Functions core-*. Aucune valeur secrète en dur : tout via secrets.
//
// Secrets attendus (supabase secrets set) :
//   CORE_EMAIL, CORE_PASSWORD, CORE_API_KEY
//   CORE_API_BASE   (déf. sandbox : https://sandbox-api.corebycarlo.com/api/v1/partner)
//   CORE_AUTH_BASE  (déf. sandbox : https://sandbox-api.corebycarlo.com/api/v1/auth/partner)
//   SITE_URL

const API_BASE = Deno.env.get("CORE_API_BASE") ?? "https://sandbox-api.corebycarlo.com/api/v1/partner";
const AUTH_BASE = Deno.env.get("CORE_AUTH_BASE") ?? "https://sandbox-api.corebycarlo.com/api/v1/auth/partner";

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

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Montants d'abonnement en euros, paramétrables (à renseigner une fois les tarifs fixés).
export function planAmount(period: string): number {
  const monthly = parseFloat(Deno.env.get("CORE_PRICE_MONTHLY") ?? "0");
  const annual = parseFloat(Deno.env.get("CORE_PRICE_ANNUAL") ?? "0");
  return period === "annual" ? annual : monthly;
}
