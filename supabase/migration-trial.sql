-- =========================================================================
-- Migration — Essai gratuit 14 jours SANS carte bancaire
-- À exécuter APRÈS schema.sql et migration-core.sql.
-- Idempotente : ré-exécutable sans dommage.
--
-- MODÈLE RETENU
--   Inscription    → subscription_status = 'trialing' pendant 14 jours,
--                    AUCUNE carte demandée, 1 seul événement inclus.
--   Fin de l'essai → 'inactive' (aucun prélèvement possible sans carte).
--                    Le client doit revenir saisir sa carte pour s'abonner.
--   Abonnement     → 'active', renouvelé automatiquement (carte enregistrée).
-- =========================================================================

-- ---- Colonnes de suivi ----
alter table public.profiles add column if not exists trial_events_used integer not null default 0;
alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists renewal_attempts integer not null default 0;

-- ---- Essai ouvert automatiquement à l'inscription ----
-- Aucune friction : le compte est utilisable immédiatement, sans carte.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, subscription_status, trial_started_at, current_period_end)
  values (new.id, new.email, 'trialing', now(), now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;

-- ---- Limite d'événements pendant l'essai (contrôle CÔTÉ BASE) ----
-- Règle : 1 seul événement sur TOUTE la durée de l'essai. Le compteur ne redescend
-- jamais — supprimer son événement ne redonne pas droit à un nouveau. Un contrôle
-- uniquement dans le navigateur serait contournable.
create or replace function public.enforce_trial_event_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_used   integer;
  v_limit  constant integer := 1;
begin
  select subscription_status, trial_events_used
    into v_status, v_used
    from public.profiles
   where id = new.owner_id;

  if v_status is null then
    return new;   -- profil introuvable : les policies RLS trancheront
  end if;

  if v_status = 'trialing' then
    if v_used >= v_limit then
      raise exception 'TRIAL_EVENT_LIMIT'
        using hint = 'Un seul événement est inclus dans l''essai gratuit.';
    end if;
    update public.profiles
       set trial_events_used = trial_events_used + 1
     where id = new.owner_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_trial_event_limit on public.events;
create trigger trg_enforce_trial_event_limit
  before insert on public.events
  for each row execute function public.enforce_trial_event_limit();

-- ---- Index pour la tâche d'échéance ----
create index if not exists profiles_period_end_idx
  on public.profiles (current_period_end)
  where subscription_status in ('trialing', 'active', 'past_due');

-- ---- Ouvrir l'essai aux comptes déjà créés (optionnel) ----
-- Décommenter pour faire bénéficier de l'essai les comptes existants sans abonnement
-- et n'ayant jamais eu d'essai :
--
-- update public.profiles
--    set subscription_status = 'trialing',
--        trial_started_at    = now(),
--        current_period_end  = now() + interval '14 days'
--  where subscription_status = 'inactive'
--    and trial_started_at is null;
