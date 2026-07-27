-- =========================================================================
-- Schéma Supabase — Plan de table SaaS
-- À exécuter dans Supabase > SQL Editor (ou via `supabase db push`).
-- =========================================================================

-- ---- Extension nécessaire pour gen_random_uuid() ----
create extension if not exists pgcrypto;

-- ---- Table des profils (1 ligne par utilisateur, créée automatiquement) ----
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'standard',              -- 'standard' | 'premium' (paramétrable)
  subscription_status text not null default 'inactive', -- 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled'
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

-- ---- Table des événements (plans de table) ----
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nouvel événement',
  doc jsonb not null default '{}'::jsonb,   -- état complet de l'éditeur (guests, tables, themeColor, ...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_owner_id_idx on public.events (owner_id);

-- ---- Trigger : créer automatiquement un profil à l'inscription ----
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Row Level Security ----
alter table public.profiles enable row level security;
alter table public.events enable row level security;

-- Un utilisateur ne voit / modifie que son propre profil.
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);
-- Aucune policy insert/delete côté client : la ligne est créée par le trigger,
-- et les champs stripe_* ne sont modifiables que par la Edge Function (service role).

-- Fonction utilitaire : l'utilisateur courant a-t-il un abonnement actif ?
create or replace function public.has_active_subscription()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and subscription_status in ('active', 'trialing')
  );
$$ language sql security definer stable;

-- Un utilisateur ne voit / modifie que ses propres événements,
-- et uniquement s'il a un abonnement actif.
create policy "events: select own" on public.events
  for select using (auth.uid() = owner_id and public.has_active_subscription());
create policy "events: insert own" on public.events
  for insert with check (auth.uid() = owner_id and public.has_active_subscription());
create policy "events: update own" on public.events
  for update using (auth.uid() = owner_id and public.has_active_subscription());
create policy "events: delete own" on public.events
  for delete using (auth.uid() = owner_id);

-- Maintenir updated_at automatiquement.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ---- Realtime : activer la réplication sur la table events ----
alter publication supabase_realtime add table public.events;

-- =========================================================================
-- NOTE — Collaboration par lien (fonctionnalité de la v1.x, non reprise ici) :
-- L'ancien modèle permettait à quiconque avec le lien d'éditer un plan sans
-- compte. Avec RLS scopée à owner_id, ce n'est plus possible tel quel.
-- Si la collaboration par lien reste nécessaire (ex. un client externe édite
-- son plan sans créer de compte), il faudra une table `event_shares`
-- (event_id, token, permission) avec une policy dédiée, ou un accès via
-- Edge Function utilisant la service role. Non implémenté — à trancher.
-- =========================================================================
