// Edge Function : collab-invite
// Génère un lien d'invitation à collaborer sur un événement.
//
// Règles appliquées ici (et pas seulement dans l'interface) :
//   - seul le PROPRIÉTAIRE de l'événement peut inviter ;
//   - son abonnement doit être ACTIF ('trialing' ne suffit pas) ;
//   - le lien expire au bout de 7 jours ;
//   - le jeton n'est renvoyé qu'une fois, en clair, à celui qui l'a créé :
//     la base ne conserve que son empreinte SHA-256.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS } from "../_shared/core.ts";

const INVITE_DAYS = 7;

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

    const body = await req.json().catch(() => ({}));
    const eventId = String(body.eventId ?? "");
    const role = body.role === "viewer" ? "viewer" : "placer";
    if (!eventId) return json({ error: "Événement manquant" }, 400);

    // --- Propriété de l'événement ---
    const { data: ev } = await supabase.from("events")
      .select("id, owner_id, name").eq("id", eventId).single();
    if (!ev || ev.owner_id !== user.id) {
      return json({ error: "Événement introuvable" }, 404);
    }

    // --- Abonnement actif exigé (l'essai ne donne pas droit à la collaboration) ---
    const { data: profile } = await supabase.from("profiles")
      .select("subscription_status").eq("id", user.id).single();
    if (profile?.subscription_status !== "active") {
      return json({
        error: "La collaboration est réservée aux abonnés",
        reason: "subscription_required",
        status: profile?.subscription_status ?? null,
      }, 403);
    }

    // --- Plafond de collaborateurs déjà atteint ? ---
    const { count } = await supabase.from("event_collaborators")
      .select("id", { count: "exact", head: true }).eq("event_id", eventId);
    const { data: maxRow } = await supabase.rpc("max_collaborators");
    const max = typeof maxRow === "number" ? maxRow : 10;
    if ((count ?? 0) >= max) {
      return json({ error: `Maximum de ${max} collaborateurs atteint`, reason: "cap_reached" }, 409);
    }

    // --- Jeton ---
    const raw = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = await sha256Hex(raw);
    const expires = new Date();
    expires.setDate(expires.getDate() + INVITE_DAYS);

    const { error: insErr } = await supabase.from("event_invites").insert({
      event_id: eventId,
      token_hash: tokenHash,
      role,
      created_by: user.id,
      expires_at: expires.toISOString(),
    });
    if (insErr) return json({ error: "Création du lien impossible" }, 500);

    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    return json({
      url: `${siteUrl}/join.html?token=${raw}`,
      role,
      expiresAt: expires.toISOString(),
      eventName: ev.name,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
