-- =========================================================================
-- Audit de sécurité — correctifs
-- À exécuter APRÈS toutes les migrations précédentes. Idempotente.
--
-- Contexte : audit complet des règles d'accès (RLS) et des droits de colonne
-- sur les cinq tables du projet, mené après le correctif de `profiles`.
-- =========================================================================


-- =========================================================================
-- 1. 🔴 CRITIQUE — Escalade de privilège : un « placeur » pouvait devenir
--    propriétaire de l'événement.
--
-- La policy « events: update own or placer » autorise l'écriture à un
-- collaborateur placeur. Le trigger enforce_collaborator_write_scope, censé le
-- restreindre au seul placement, ne comparait que `name` et `doc` — jamais
-- `owner_id`. Et faute de clause `with check` explicite, PostgreSQL réutilise
-- la clause `using`, qui porte sur l'identifiant de l'événement (inchangé) :
-- le placeur reste donc « placeur » du point de vue du contrôle pendant toute
-- l'opération.
--
-- Conséquence : un collaborateur invité à déplacer des invités pouvait exécuter
--     update events set owner_id = <son id> where id = <événement>
-- et prendre possession de l'événement — puis le supprimer, révoquer le vrai
-- propriétaire, ou inviter des tiers.
--
-- Correctif : le trigger refuse désormais toute modification de `owner_id` et
-- de `id` par un utilisateur authentifié, quel que soit son rôle. Aucun parcours
-- légitime ne transfère la propriété d'un événement ; les Edge Functions ne
-- touchent jamais à `owner_id` (vérifié).
-- =========================================================================

create or replace function public.enforce_collaborator_write_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.my_event_role(new.id);

  -- Contexte serveur (Edge Functions, clé de service) : auth.uid() est nul,
  -- my_event_role renvoie null. Aucune restriction, comme avant.
  if v_role is null then
    return new;
  end if;

  -- ---- Garde-fou commun à TOUS les rôles authentifiés ----
  -- La propriété d'un événement ne se transfère par aucun parcours de
  -- l'application. Interdire ce changement ferme l'escalade décrite ci-dessus.
  if new.owner_id is distinct from old.owner_id then
    raise exception 'EVENT_OWNER_IMMUTABLE'
      using hint = 'La propriété d''un événement ne peut pas être modifiée.';
  end if;
  if new.id is distinct from old.id then
    raise exception 'EVENT_ID_IMMUTABLE'
      using hint = 'L''identifiant d''un événement ne peut pas être modifié.';
  end if;

  if v_role = 'owner' then
    return new;
  end if;

  if v_role = 'viewer' then
    raise exception 'COLLAB_READ_ONLY'
      using hint = 'Votre accès à cet événement est en lecture seule.';
  end if;

  if v_role = 'placer' then
    if new.name is distinct from old.name then
      raise exception 'COLLAB_SCOPE_NAME'
        using hint = 'Vous pouvez uniquement déplacer les invités.';
    end if;
    if public.doc_without_seats(old.doc) is distinct from public.doc_without_seats(new.doc) then
      raise exception 'COLLAB_SCOPE_DOC'
        using hint = 'Vous pouvez uniquement déplacer les invités (tables, fiches et réglages sont verrouillés).';
    end if;
    return new;
  end if;

  raise exception 'COLLAB_FORBIDDEN';
end;
$$;

drop trigger if exists trg_collaborator_write_scope on public.events;
create trigger trg_collaborator_write_scope
  before update on public.events
  for each row execute function public.enforce_collaborator_write_scope();


-- =========================================================================
-- 2. Défense en profondeur — droits au niveau colonne sur `events`
--
-- Le trigger ci-dessus suffit, mais une seconde barrière ne coûte rien : le
-- client n'écrit légitimement que `name` et `doc` (vérifié dans event.html).
-- `updated_at` est maintenu par le trigger touch_updated_at, `owner_id` n'est
-- renseigné qu'à la création (les droits d'INSERT sont distincts de ceux
-- d'UPDATE, la création d'événement n'est donc pas affectée).
-- =========================================================================

revoke update on public.events from authenticated;
grant  update (name, doc) on public.events to authenticated;
revoke update on public.events from anon;


-- =========================================================================
-- 3. Moindre privilège — `event_invites`
--
-- La policy « invites: owner revokes » existe pour permettre au propriétaire de
-- révoquer un lien. Sans restriction de colonne, il pouvait aussi réécrire
-- `token_hash`, `expires_at` ou `role`. Ce n'est pas une escalade (il est déjà
-- propriétaire), mais rien ne le justifie : on limite à `revoked_at`.
-- =========================================================================

revoke update on public.event_invites from authenticated;
grant  update (revoked_at) on public.event_invites to authenticated;
revoke update on public.event_invites from anon;


-- =========================================================================
-- 4. Vérifications — tables sans écriture client
--
-- `payments` : policy SELECT uniquement. `event_collaborators` : SELECT et
-- DELETE (par le propriétaire) uniquement. En RLS, une opération sans policy
-- correspondante est refusée, donc l'écriture est déjà impossible ; les revokes
-- ci-dessous ne sont qu'une ceinture supplémentaire, au cas où une policy serait
-- ajoutée par inadvertance plus tard.
-- =========================================================================

revoke insert, update, delete on public.payments from authenticated, anon;
revoke insert, update on public.event_collaborators from authenticated, anon;


-- =========================================================================
-- 5. Contrôles à exécuter après cette migration
--
-- a) Colonnes réellement modifiables par le client :
--      select table_name, column_name
--        from information_schema.column_privileges
--       where grantee = 'authenticated' and privilege_type = 'UPDATE'
--       order by table_name, column_name;
--    Attendu : events(doc, name), event_invites(revoked_at), profiles(lang).
--
-- b) RLS active partout :
--      select tablename, rowsecurity from pg_tables
--       where schemaname = 'public';
--    Attendu : true pour les cinq tables.
--
-- c) Test fonctionnel de l'escalade (doit ÉCHOUER, connecté en collaborateur) :
--      update events set owner_id = auth.uid() where id = '<événement partagé>';
--    Attendu : erreur EVENT_OWNER_IMMUTABLE.
-- =========================================================================
