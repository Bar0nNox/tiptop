-- ============================================================================
-- TipTop — migration-venues.sql                          (v1.23.0)
--
-- Bibliothèque de lieux (§5.8.3 du roadmap) : une implantation réutilisable —
-- tables, repères d'orientation, éléments de décor — enregistrée par un compte
-- et réappliquée à un autre événement.
--
-- DÉCISIONS (27/09/2026)
--   · Ouverte à tous les abonnés (essai compris), PRIVÉE : un lieu appartient
--     au compte qui l'a créé et n'est visible de personne d'autre, pas même des
--     collaborateurs de ses événements — la collaboration est par événement,
--     il n'existe pas de notion d'équipe.
--   · INSTANTANÉ : appliquer un lieu COPIE son implantation dans l'événement.
--     Modifier ou supprimer le lieu ensuite ne réécrit jamais un plan existant.
--
-- SÉCURITÉ — mêmes principes que le §6
--   · Liste blanche au niveau colonne : le navigateur n'écrit que `name` et
--     `layout`. `owner_id` est posé par la base (défaut `auth.uid()`) et vérifié
--     par la policy ; il n'est pas modifiable ensuite.
--   · Écriture (création, modification) réservée à un abonnement actif ou en
--     essai, comme les événements ; lecture et suppression toujours permises à
--     son propriétaire — pouvoir effacer ses données ne se conditionne pas à un
--     paiement (même règle que `events: delete own`).
--   · Bornes : nom de 1 à 80 caractères, implantation ≤ 200 Ko, 100 lieux par
--     compte. Un document de taille ou de nombre illimités ouvrirait la base à
--     un remplissage arbitraire depuis n'importe quel compte d'essai.
--
-- Idempotent.
-- ============================================================================

begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'has_active_subscription') then
    raise exception 'Fonction has_active_subscription() absente — exécuter schema.sql d''abord.';
  end if;
end $$;

create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  layout      jsonb not null default '{}'::jsonb,   -- { tables, nextTable, edges, decor }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint venues_name_len   check (char_length(btrim(name)) between 1 and 80),
  constraint venues_layout_obj check (jsonb_typeof(layout) = 'object'),
  constraint venues_layout_len check (octet_length(layout::text) <= 200000)
);

create index if not exists venues_owner_id_idx on public.venues (owner_id);

alter table public.venues enable row level security;

drop policy if exists "venues: select own" on public.venues;
create policy "venues: select own" on public.venues
  for select using (owner_id = auth.uid());

drop policy if exists "venues: insert own" on public.venues;
create policy "venues: insert own" on public.venues
  for insert with check (owner_id = auth.uid() and public.has_active_subscription());

drop policy if exists "venues: update own" on public.venues;
create policy "venues: update own" on public.venues
  for update using (owner_id = auth.uid() and public.has_active_subscription())
             with check (owner_id = auth.uid());

drop policy if exists "venues: delete own" on public.venues;
create policy "venues: delete own" on public.venues
  for delete using (owner_id = auth.uid());

-- Droits colonne : liste blanche. Supabase accorde par défaut tous les droits
-- aux rôles `anon` et `authenticated` sur une nouvelle table ; on repart de zéro.
revoke all on public.venues from anon, authenticated;
grant select, delete        on public.venues to authenticated;
grant insert (name, layout) on public.venues to authenticated;
grant update (name, layout) on public.venues to authenticated;

-- updated_at tenu par la base (fonction existante de schema.sql).
drop trigger if exists venues_touch_updated_at on public.venues;
create trigger venues_touch_updated_at
  before update on public.venues
  for each row execute function public.touch_updated_at();

-- Plafond de lieux par compte, vérifié en base : un contrôle côté navigateur
-- se contourne depuis la console.
create or replace function public.enforce_venue_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.venues where owner_id = new.owner_id) >= 100 then
    raise exception 'VENUE_CAP_REACHED'
      using hint = 'Nombre maximal de lieux atteint (100).';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_venue_cap() from public;

drop trigger if exists venues_cap on public.venues;
create trigger venues_cap
  before insert on public.venues
  for each row execute function public.enforce_venue_cap();

commit;

-- =========================================================================
-- Contrôle au navigateur, connecté (le SQL Editor s'exécute en rôle de
-- service et ne prouve rien) :
--   const c = window.getSupabaseClient();
--   // doit RÉUSSIR
--   console.log(await c.from("venues").insert({ name:"Test", layout:{tables:[]} }).select());
--   // doit ÉCHOUER (colonne hors liste blanche)
--   console.log(await c.from("venues").insert({ name:"X", layout:{}, owner_id:"<autre uuid>" }));
--   // doit ne rien renvoyer d'un autre compte
--   console.log(await c.from("venues").select("*"));
-- =========================================================================
