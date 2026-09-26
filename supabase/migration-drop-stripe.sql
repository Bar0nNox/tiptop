-- ============================================================================
-- TipTop — migration-drop-stripe.sql                     (v1.22.0)
--
-- Supprime les deux colonnes résiduelles de l'intégration Stripe abandonnée au
-- profit de Core by Carlo : `profiles.stripe_customer_id` et
-- `profiles.stripe_subscription_id`.
--
-- Aucune référence ne subsiste dans le code actif (pages, scripts partagés,
-- Edge Functions — vérifié par balayage en v1.22.0). Leur seul effet était de
-- laisser croire, à qui reprend le schéma, que Stripe est encore branché.
--
-- ⚠ IRRÉVERSIBLE. Le roadmap (§5.3) prescrivait de vérifier à la main que
-- toutes les valeurs sont nulles avant d'exécuter. La vérification est ici
-- portée par la migration elle-même : une seule valeur non nulle fait échouer
-- l'ensemble, la transaction est annulée et rien n'est supprimé. Un contrôle
-- confié à la vigilance est le mode de défaut habituel du projet.
--
-- Idempotent : rejouée après coup, elle constate l'absence des colonnes et ne
-- fait rien.
-- ============================================================================

begin;

do $$
declare
  n bigint;
  a_col boolean;
  b_col boolean;
begin
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles'
                   and column_name = 'stripe_customer_id') into a_col;
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles'
                   and column_name = 'stripe_subscription_id') into b_col;

  if not a_col and not b_col then
    raise notice 'Colonnes stripe_* déjà absentes — rien à faire.';
    return;
  end if;

  -- Comptage dynamique : une colonne déjà supprimée ferait échouer un
  -- `select` écrit en dur.
  execute format(
    'select count(*) from public.profiles where %s',
    concat_ws(' or ',
      case when a_col then 'stripe_customer_id is not null' end,
      case when b_col then 'stripe_subscription_id is not null' end)
  ) into n;

  if n > 0 then
    raise exception
      '% profil(s) portent encore une valeur stripe_*. Suppression refusée : '
      'examiner ces lignes avant toute décision (select id, stripe_customer_id, '
      'stripe_subscription_id from profiles where stripe_customer_id is not null '
      'or stripe_subscription_id is not null).', n;
  end if;
end $$;

alter table public.profiles
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id;

-- Contrôle final : l'absence est constatée, pas supposée.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles'
               and column_name like 'stripe\_%') then
    raise exception 'Une colonne stripe_* subsiste après suppression.';
  end if;
end $$;

commit;
