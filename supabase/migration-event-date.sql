-- =========================================================================
-- Migration — Date de l'événement
-- À exécuter APRÈS migration-collab-scope.sql. Idempotente.
--
-- Choix : une COLONNE plutôt qu'un champ du document.
-- Dans le document, la date serait invisible à la base : impossible de trier,
-- de filtrer les événements passés, ou de déclencher une relance « votre
-- événement est dans 3 jours » sans charger tous les événements.
--
-- Type `date` et non `timestamptz` : un événement a lieu « le 14 juin » quel
-- que soit le fuseau de celui qui regarde. Un horodatage décalerait la date
-- affichée pour un collaborateur situé ailleurs — d'autant plus sensible que
-- la clientèle est internationale.
-- =========================================================================

alter table public.events
  add column if not exists event_date date;

-- Tri par date à venir : index utile dès que le nombre d'événements grandit.
create index if not exists events_owner_date_idx
  on public.events (owner_id, event_date);

-- =========================================================================
-- ⚠️ DROIT D'ÉCRITURE — indispensable
-- `migration-security-audit.sql` a restreint les colonnes modifiables par le
-- rôle `authenticated` à (name, doc). Sans la ligne ci-dessous, PERSONNE ne
-- pourrait renseigner la date depuis le navigateur, propriétaire compris.
-- =========================================================================
grant update (event_date) on public.events to authenticated;

-- =========================================================================
-- La date est une PROPRIÉTÉ D'ÉVÉNEMENT : le collaborateur ne doit pas la
-- modifier, au même titre que le nom et la couleur.
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

  -- Contexte serveur (Edge Functions, clé de service) : aucune restriction.
  if v_role is null then
    return new;
  end if;

  -- Garde-fou commun : la propriété d'un événement ne se transfère pas.
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
        using hint = 'Le nom de l''événement est réservé à son propriétaire.';
    end if;
    -- Nouveau : la date est une propriété d'événement.
    if new.event_date is distinct from old.event_date then
      raise exception 'COLLAB_SCOPE_DATE'
        using hint = 'La date de l''événement est réservée à son propriétaire.';
    end if;
    -- Liste blanche : tout ce qui n'est pas explicitement autorisé doit être
    -- inchangé (voir doc_locked_part).
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

-- =========================================================================
-- Contrôle après exécution :
--   select column_name from information_schema.column_privileges
--    where grantee='authenticated' and table_name='events' and privilege_type='UPDATE';
--   → attendu : doc, event_date, name
-- =========================================================================
