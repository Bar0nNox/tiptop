-- =========================================================================
-- Migration — Collaboration sur un événement
-- À exécuter APRÈS schema.sql, migration-core.sql et migration-trial.sql.
-- Idempotente : ré-exécutable sans dommage.
--
-- MODÈLE
--   Rôles : 'placer' (déplacer les invités uniquement) | 'viewer' (lecture seule).
--   Réservé aux propriétaires dont l'abonnement est ACTIF (pas en essai).
--   Le lien d'invitation expire au bout de 7 jours ; l'accès accordé persiste
--   jusqu'à révocation. Si l'abonnement du propriétaire s'arrête, les
--   collaborateurs perdent l'accès immédiatement.
-- =========================================================================

-- ---- Accès accordés ----
create table if not exists public.event_collaborators (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('placer', 'viewer')),
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (event_id, user_id)
);
create index if not exists event_collaborators_event_idx on public.event_collaborators (event_id);
create index if not exists event_collaborators_user_idx  on public.event_collaborators (user_id);

-- ---- Invitations (liens) ----
-- Le jeton n'est JAMAIS stocké en clair : seule son empreinte est conservée, pour
-- qu'une fuite de la base ne donne pas accès aux événements.
create table if not exists public.event_invites (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  token_hash  text not null unique,
  role        text not null check (role in ('placer', 'viewer')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  uses        integer not null default 0
);
create index if not exists event_invites_event_idx on public.event_invites (event_id);

-- ---- Plafond de collaborateurs ----
create or replace function public.max_collaborators()
returns integer language sql immutable as $$ select 6 $$;

-- =========================================================================
-- Fonctions utilitaires
-- =========================================================================

-- L'abonnement du PROPRIÉTAIRE d'un événement est-il actif ?
-- 'trialing' est volontairement exclu : la collaboration est réservée aux abonnés.
create or replace function public.owner_has_active_paid_subscription(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.events e
      join public.profiles p on p.id = e.owner_id
     where e.id = p_event_id
       and p.subscription_status = 'active'
  );
$$;

-- Rôle de l'utilisateur courant sur un événement : 'owner' | 'placer' | 'viewer' | null
create or replace function public.my_event_role(p_event_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (select 1 from public.events e
                  where e.id = p_event_id and e.owner_id = auth.uid())
      then 'owner'
    else (
      select c.role
        from public.event_collaborators c
       where c.event_id = p_event_id
         and c.user_id = auth.uid()
         and public.owner_has_active_paid_subscription(p_event_id)
       limit 1
    )
  end;
$$;

-- Liste des personnes ayant accès (réservée au propriétaire de l'événement).
-- Passe par une fonction car les policies RLS de `profiles` empêchent de lire
-- l'e-mail d'un autre utilisateur.
create or replace function public.list_event_collaborators(p_event_id uuid)
returns table (
  collaborator_id uuid,
  email text,
  role text,
  created_at timestamptz,
  last_seen_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, p.email, c.role, c.created_at, c.last_seen_at
    from public.event_collaborators c
    join public.profiles p on p.id = c.user_id
   where c.event_id = p_event_id
     and exists (select 1 from public.events e
                  where e.id = p_event_id and e.owner_id = auth.uid())
   order by c.created_at;
$$;

-- =========================================================================
-- Restriction du rôle « placer » : seules les places assises peuvent changer
-- =========================================================================

-- Retire l'attribution de siège de tous les invités et le marqueur technique de
-- synchronisation. Deux documents dont la version « sans sièges » est identique ne
-- diffèrent donc QUE par le placement.
create or replace function public.doc_without_seats(doc jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_set(
    (doc - '_writer'),
    '{guests}',
    coalesce(
      (select jsonb_agg(g - 'seat' order by ord)
         from jsonb_array_elements(coalesce(doc->'guests', '[]'::jsonb))
              with ordinality t(g, ord)),
      '[]'::jsonb
    )
  );
$$;

-- Contrôle CÔTÉ BASE : un collaborateur ne peut pas contourner l'interface.
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

  -- Propriétaire (ou contexte serveur sans utilisateur) : aucune restriction.
  if v_role is null or v_role = 'owner' then
    return new;
  end if;

  if v_role = 'viewer' then
    raise exception 'COLLAB_READ_ONLY'
      using hint = 'Votre accès à cet événement est en lecture seule.';
  end if;

  if v_role = 'placer' then
    -- Le nom de l'événement ne doit pas changer.
    if new.name is distinct from old.name then
      raise exception 'COLLAB_SCOPE_NAME'
        using hint = 'Vous pouvez uniquement déplacer les invités.';
    end if;
    -- Tout le reste du document doit être identique, hors placement.
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
-- Row Level Security
-- =========================================================================

-- Lecture : propriétaire (comme avant) OU collaborateur d'un événement dont le
-- propriétaire est abonné actif.
drop policy if exists "events: select own" on public.events;
create policy "events: select own or shared" on public.events
  for select using (
    (auth.uid() = owner_id and public.has_active_subscription())
    or exists (
      select 1 from public.event_collaborators c
       where c.event_id = events.id
         and c.user_id = auth.uid()
         and public.owner_has_active_paid_subscription(events.id)
    )
  );

-- Écriture : propriétaire, ou collaborateur « placer ». Le PÉRIMÈTRE de l'écriture
-- est contrôlé par le trigger ci-dessus (la policy autorise, le trigger restreint).
drop policy if exists "events: update own" on public.events;
create policy "events: update own or placer" on public.events
  for update using (
    (auth.uid() = owner_id and public.has_active_subscription())
    or exists (
      select 1 from public.event_collaborators c
       where c.event_id = events.id
         and c.user_id = auth.uid()
         and c.role = 'placer'
         and public.owner_has_active_paid_subscription(events.id)
    )
  );

-- Les collaborateurs voient leur propre ligne d'accès ; le propriétaire voit toutes
-- celles de ses événements et peut les supprimer (révocation).
alter table public.event_collaborators enable row level security;

drop policy if exists "collab: select own or owner" on public.event_collaborators;
create policy "collab: select own or owner" on public.event_collaborators
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.events e
                where e.id = event_collaborators.event_id and e.owner_id = auth.uid())
  );

drop policy if exists "collab: owner revokes" on public.event_collaborators;
create policy "collab: owner revokes" on public.event_collaborators
  for delete using (
    exists (select 1 from public.events e
             where e.id = event_collaborators.event_id and e.owner_id = auth.uid())
  );

-- Aucune policy insert/update côté client : les accès sont créés par l'Edge Function
-- collab-join (service role), après vérification du jeton.

-- Les invitations ne sont lisibles que par le propriétaire de l'événement ; leur
-- création et leur consommation passent par les Edge Functions.
alter table public.event_invites enable row level security;

drop policy if exists "invites: owner reads" on public.event_invites;
create policy "invites: owner reads" on public.event_invites
  for select using (
    exists (select 1 from public.events e
             where e.id = event_invites.event_id and e.owner_id = auth.uid())
  );

drop policy if exists "invites: owner revokes" on public.event_invites;
create policy "invites: owner revokes" on public.event_invites
  for update using (
    exists (select 1 from public.events e
             where e.id = event_invites.event_id and e.owner_id = auth.uid())
  );

-- ---- Realtime ----
-- Les collaborateurs doivent recevoir les changements en direct.
do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;
end $$;
