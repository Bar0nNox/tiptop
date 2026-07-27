// Edge Function : collab-join
// Consomme un lien d'invitation et accorde l'accès à l'utilisateur connecté.
//
// Vérifications effectuées côté serveur — aucune n'est déportable dans le navigateur :
//   - le jeton correspond à une invitation existante (comparaison par empreinte) ;
//   - elle n'est ni révoquée, ni expirée ;
//   - l'abonnement du propriétaire est toujours actif ;
//   - le plafond de collaborateurs n'est pas atteint ;
//   - le propriétaire ne peut pas « rejoindre » son propre événement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS } from "../_shared/core.ts";

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
    const token = String(body.token ?? "");
    if (!token) return json({ error: "Lien invalide" }, 400);

    const tokenHash = await sha256Hex(token);
    const { data: invite } = await supabase.from("event_invites")
      .select("id, event_id, role, expires_at, revoked_at, uses")
      .eq("token_hash", tokenHash).maybeSingle();

    if (!invite) return json({ error: "Lien invalide", reason: "not_found" }, 404);
    if (invite.revoked_at) return json({ error: "Ce lien a été révoqué", reason: "revoked" }, 410);
    if (new Date(invite.expires_at) < new Date()) {
      return json({ error: "Ce lien a expiré", reason: "expired" }, 410);
    }

    const { data: ev } = await supabase.from("events")
      .select("id, name, owner_id").eq("id", invite.event_id).single();
    if (!ev) return json({ error: "Événement introuvable" }, 404);

    if (ev.owner_id === user.id) {
      return json({ eventId: ev.id, eventName: ev.name, role: "owner", alreadyOwner: true });
    }

    // Abonnement du propriétaire toujours actif ?
    const { data: ownerProfile } = await supabase.from("profiles")
      .select("subscription_status").eq("id", ev.owner_id).single();
    if (ownerProfile?.subscription_status !== "active") {
      return json({
        error: "Cet événement n'est plus partagé",
        reason: "owner_subscription_inactive",
      }, 403);
    }

    // Accès déjà accordé ? (idempotent : ouvrir deux fois le lien ne crée pas de doublon)
    const { data: existing } = await supabase.from("event_collaborators")
      .select("id, role").eq("event_id", ev.id).eq("user_id", user.id).maybeSingle();

    if (!existing) {
      const { count } = await supabase.from("event_collaborators")
        .select("id", { count: "exact", head: true }).eq("event_id", ev.id);
      const { data: maxRow } = await supabase.rpc("max_collaborators");
      const max = typeof maxRow === "number" ? maxRow : 6;
      if ((count ?? 0) >= max) {
        return json({ error: "Ce plan de table a atteint son nombre maximum de collaborateurs", reason: "cap_reached" }, 409);
      }

      const { error: insErr } = await supabase.from("event_collaborators").insert({
        event_id: ev.id,
        user_id: user.id,
        role: invite.role,
        invited_by: ev.owner_id,
      });
      if (insErr) return json({ error: "Impossible d'accorder l'accès" }, 500);
    }

    await supabase.from("event_invites")
      .update({ uses: (invite.uses ?? 0) + 1 }).eq("id", invite.id);

    return json({
      eventId: ev.id,
      eventName: ev.name,
      role: existing?.role ?? invite.role,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

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
