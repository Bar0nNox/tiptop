-- =========================================================================
-- Migration — Élargissement du rôle « placer » (affiché : « Collaborateur »)
-- À exécuter APRÈS toutes les migrations précédentes. Idempotente.
--
-- Avant : le collaborateur ne pouvait modifier QUE l'attribution des sièges.
-- Après : il peut modifier les tables, les invités, le compteur de tables et les
--         repères d'orientation — mais pas les propriétés de l'événement
--         (nom, couleur).
--
-- ⚠️ POSTURE DE SÉCURITÉ CONSERVÉE — point important.
-- On aurait pu écrire « tout est permis SAUF le nom et la couleur ». Ce serait
-- une liste noire : tout champ ajouté au document plus tard serait modifiable
-- par défaut, sans que personne y pense.
-- On garde donc une LISTE BLANCHE : on retire du document les seuls champs
-- autorisés, puis on compare le reste. Un champ ajouté demain se retrouvera
-- dans la comparaison, donc verrouillé par défaut — il faudra l'autoriser
-- explicitement, ce qui est le bon sens de lecture.
-- =========================================================================

-- Partie VERROUILLÉE du document : tout sauf les champs que le collaborateur
-- a le droit de modifier. C'est cette partie qui doit rester identique.
create or replace function public.doc_locked_part(doc jsonb)
returns jsonb
language sql
immutable
as $$
  select (coalesce(doc, '{}'::jsonb))
           - '_writer'      -- marqueur d'écriture, jamais significatif
           - 'tables'       -- ✅ modifiable par le collaborateur
           - 'guests'       -- ✅
           - 'nextTable'    -- ✅ compteur lié aux tables
           - 'edges';       -- ✅ repères d'orientation (décrivent la salle)
$$;

-- =========================================================================
-- Trigger : périmètre d'écriture selon le rôle
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

  -- Contexte serveur (Edge Functions, clé de service) : auth.uid() est nul.
  if v_role is null then
    return new;
  end if;

  -- ---- Garde-fou commun à tous les rôles authentifiés ----
  -- La propriété d'un événement ne se transfère par aucun parcours de
  -- l'application (voir l'escalade de privilège corrigée précédemment).
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
    -- Le nom de l'événement est une propriété d'événement : il vit dans la
    -- colonne `name` ET dans doc->eventName, les deux sont protégés.
    if new.name is distinct from old.name then
      raise exception 'COLLAB_SCOPE_NAME'
        using hint = 'Le nom de l''événement est réservé à son propriétaire.';
    end if;
    -- Tout ce qui n'est pas explicitement autorisé doit être inchangé.
    if public.doc_locked_part(old.doc) is distinct from public.doc_locked_part(new.doc) then
      raise exception 'COLLAB_SCOPE_DOC'
        using hint = 'Vous pouvez modifier les tables et les invités, mais pas les propriétés de l''événement.';
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

-- `doc_without_seats` n'est plus utilisée. Conservée pour l'instant : la
-- supprimer casserait une éventuelle policy encore en place. À retirer après
-- vérification.
-- drop function if exists public.doc_without_seats(jsonb);

-- =========================================================================
-- Contrôle après exécution — connecté en COLLABORATEUR, depuis la console du
-- navigateur (le SQL Editor s'exécute en rôle de service, sans restriction) :
--
--   const c = window.getSupabaseClient();
--   const id = new URLSearchParams(location.search).get("event");
--   // doit RÉUSSIR : ajout d'une table
--   console.log(await c.from("events").update({ doc: {...state, tables:[...state.tables,
--     {id:"tX",name:"Test",shape:"round",orient:"horizontal",ends:0,seats:4,x:500,y:500}]} }).eq("id", id));
--   // doit ÉCHOUER : changement de couleur (propriété d'événement)
--   console.log(await c.from("events").update({ doc: {...state, themeColor:"#FF0000"} }).eq("id", id));
-- =========================================================================
