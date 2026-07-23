-- =========================================================================
-- Migration — Intégration paiement Core by Carlo
-- À exécuter dans Supabase > SQL Editor APRÈS schema.sql (déjà exécuté).
-- Sûre à ré-exécuter (idempotente).
-- =========================================================================

-- ---- Colonnes Core sur la table des profils ----
alter table public.profiles add column if not exists core_card_id text;            -- carte enregistrée réutilisable (MIT)
alter table public.profiles add column if not exists plan_period text;             -- 'monthly' | 'annual'
alter table public.profiles add column if not exists current_period_end timestamptz; -- fin de la période payée / prochaine échéance

-- (Les anciennes colonnes stripe_* restent présentes mais ne sont plus utilisées.
--  On peut les supprimer plus tard : alter table profiles drop column stripe_customer_id, ...)

-- ---- Table des paiements (audit + idempotence des callbacks) ----
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  core_transaction_id text,            -- id de transaction renvoyé par Core
  order_reference text unique,         -- référence unique générée côté serveur (idempotence)
  amount numeric,                      -- montant en euros
  plan_period text,                    -- 'monthly' | 'annual'
  status text,                         -- 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_core_tx_idx on public.payments (core_transaction_id);

-- RLS : le client peut lire ses propres paiements (lecture seule) ; toute écriture
-- passe par les Edge Functions (service role, qui contourne la RLS).
alter table public.payments enable row level security;
drop policy if exists "payments: select own" on public.payments;
create policy "payments: select own" on public.payments
  for select using (auth.uid() = user_id);

-- =========================================================================
-- NOTE — Modèle d'abonnement Core :
-- Core ne renouvelle PAS automatiquement. Le renouvellement mensuel/annuel sera
-- assuré par une tâche planifiée (pg_cron) qui, pour chaque profil dont
-- current_period_end est atteint, rappellera l'Edge Function de prélèvement (MIT)
-- sur core_card_id. Cette tâche sera ajoutée dans un second temps.
-- =========================================================================
