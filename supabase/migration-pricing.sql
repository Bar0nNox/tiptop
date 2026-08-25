-- =========================================================================
-- Migration — Tarifs en base : source unique du prix affiché et prélevé
-- v1.21.3. À exécuter APRÈS les migrations précédentes. Idempotente.
--
-- POURQUOI
-- Jusqu'ici deux sources indépendantes, que rien ne comparait :
--   - le montant PRÉLEVÉ venait des secrets CORE_PRICE_MONTHLY / CORE_PRICE_ANNUAL,
--     lus par les Edge Functions ;
--   - le montant AFFICHÉ était écrit en dur dans `shared/i18n.js` (6 clés × 2
--     langues) et dans `supabase/functions/trial-reminders/templates.ts`.
-- Un tarif changé d'un côté et pas de l'autre donnait un client qui voit un prix
-- et en paie un autre. Deux défaillances, dont une muette : un secret resté à `0`
-- faisait que `core-renew` passait le profil en `skipped` sans toucher à
-- `current_period_end` — la tâche repassait chaque nuit sur les mêmes profils, et
-- le compte demeurait `active` indéfiniment sans jamais payer.
--
-- Cette table devient la source unique. Les secrets CORE_PRICE_* ne sont plus lus.
--
-- ⚠️ SÉCURITÉ — cette table détermine le MONTANT PRÉLEVÉ.
-- Si le rôle client pouvait l'écrire, il fixerait le prix de son propre
-- abonnement. Droits en liste blanche, comme au §6 du roadmap : `select` seul
-- pour `authenticated`, rien pour `anon`, écriture réservée à la clé de service.
-- Le contrôle se fait DEPUIS LE NAVIGATEUR, jamais depuis le SQL Editor : celui-ci
-- s'exécute avec le rôle de service et donnerait un résultat trompeur.
-- =========================================================================

-- ---- Table ----
-- Clé (plan, period) et non une ligne unique : la formule Pro du §4 imposera
-- 4 tarifs (2 formules × 2 périodicités). La structure les accueille sans
-- migration supplémentaire ; seules des lignes s'ajouteront.
create table if not exists public.app_pricing (
  plan        text        not null default 'individual',
  period      text        not null check (period in ('monthly', 'annual')),
  amount_eur  numeric(10,2) not null check (amount_eur > 0),
  updated_at  timestamptz not null default now(),
  primary key (plan, period)
);

comment on table public.app_pricing is
  'Tarifs d''abonnement en euros. Source unique du montant affiché (navigateur, '
  'e-mails) et du montant prélevé (core-charge, core-renew). Lecture seule côté '
  'client ; écriture réservée à la clé de service.';

comment on column public.app_pricing.amount_eur is
  'Montant en EUROS, décimal (9.90), jamais en centimes — convention de l''API '
  'Core by Carlo (POST /transactions/rebill : « Payment amount to debit, in euros »).';

-- ---- Amorçage ----
-- `do nothing` et non `do update` : la migration est idempotente sans écraser un
-- tarif délibérément modifié depuis. Un changement de prix se fait à la main.
insert into public.app_pricing (plan, period, amount_eur) values
  ('individual', 'monthly',  9.90),
  ('individual', 'annual',  89.90)
on conflict (plan, period) do nothing;

-- ---- Row Level Security ----
alter table public.app_pricing enable row level security;

drop policy if exists "app_pricing: read" on public.app_pricing;
create policy "app_pricing: read" on public.app_pricing
  for select to authenticated using (true);

-- ---- Droits au niveau table (liste blanche) ----
-- Supabase accorde par défaut des droits larges aux rôles `anon` et
-- `authenticated` sur les tables nouvellement créées. On révoque tout, puis on
-- n'accorde que la lecture, et au seul rôle authentifié.
--
-- `anon` n'a aucune raison de lire les tarifs : aucun prix n'est affiché hors
-- session. Les 6 clés concernées vivent dans `dashboard.html` et `account.html`,
-- toutes deux derrière `requireAuth()` ; `index.html` et `auth.html` n'en
-- portent aucune.
revoke all on public.app_pricing from anon;
revoke all on public.app_pricing from authenticated;
grant select on public.app_pricing to authenticated;

-- =========================================================================
-- Vérifications à exécuter après coup
-- =========================================================================
--
-- 1) Les deux tarifs sont présents et non nuls (doit renvoyer 2 lignes) :
--      select plan, period, amount_eur from public.app_pricing order by period;
--
-- 2) `authenticated` ne dispose que de SELECT (doit ne renvoyer que 'SELECT') :
--      select distinct privilege_type
--        from information_schema.table_privileges
--       where grantee = 'authenticated' and table_name = 'app_pricing';
--
-- 3) `anon` n'a aucun droit (doit renvoyer 0 ligne) :
--      select privilege_type
--        from information_schema.table_privileges
--       where grantee = 'anon' and table_name = 'app_pricing';
--
-- 4) DEPUIS LE NAVIGATEUR, connecté, dans la console :
--      await window.getSupabaseClient().from('app_pricing')
--        .update({ amount_eur: 0.01 }).eq('period','monthly');
--    Attendu : refus, ou 204 avec zéro ligne touchée — et surtout, un
--    `select` ultérieur doit toujours renvoyer 9.90. Un `update` refusé par RLS
--    ne remonte aucune erreur (PostgREST répond 204) : c'est la valeur relue,
--    et elle seule, qui atteste du refus.
-- =========================================================================
