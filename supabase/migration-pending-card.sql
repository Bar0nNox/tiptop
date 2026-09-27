-- ============================================================================
-- TipTop — migration-pending-card.sql                    (v1.23.1)
--
-- Carte EN ATTENTE, distincte de la carte en service.
--
-- LE DÉFAUT CORRIGÉ
-- `core-register-card` écrivait le nouvel identifiant de carte dans
-- `profiles.core_card_id` — et la périodicité dans `plan_period` — dès
-- l'OUVERTURE de la page d'enregistrement Core, avant que le client ait saisi
-- ou validé quoi que ce soit. Un client qui abandonnait la page laissait donc :
--   · un `core_card_id` pointant vers une carte jamais validée : le tableau de
--     bord le croyait équipé ; en fin d'essai, `core-renew` tentait de la
--     prélever, échouait trois nuits de suite et passait le compte en
--     `canceled` au lieu d'`inactive` ;
--   · la carte précédente, si elle existait, remplacée — perdue de vue ;
--   · la périodicité modifiée : un abonné annuel ouvrant la page en mensuel
--     puis renonçant aurait été renouvelé au tarif mensuel.
-- C'est la signature exacte du cas `+collab` du §5.6 du roadmap (« une carte
-- sans qu'aucun prélèvement ait suivi »), resté inexpliqué — hypothèse
-- vraisemblable, non démontrée, la reproduction ayant été perdue.
--
-- LE CORRECTIF
-- L'enregistrement écrit dans `pending_card_id` / `pending_plan_period`. La
-- promotion vers `core_card_id` / `plan_period` n'a lieu que côté serveur, au
-- retour par l'URL de succès de Core (`core-charge`, ou `account-actions`
-- action `confirm-card` quand la période est déjà payée).
--
-- Colonnes écrites par les Edge Functions seules : AUCUN droit d'écriture
-- accordé au rôle `authenticated` (liste blanche du §6 inchangée).
--
-- ⚠ À exécuter AVANT de redéployer `core-register-card`, `core-charge` et
-- `account-actions` : sans les colonnes, l'enregistrement de carte échoue.
--
-- Idempotent.
-- ============================================================================

begin;

alter table public.profiles add column if not exists pending_card_id     text;
alter table public.profiles add column if not exists pending_plan_period text;

-- Contrôle : le navigateur ne doit pas pouvoir écrire ces colonnes.
do $$
begin
  if exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'profiles'
      and column_name in ('pending_card_id', 'pending_plan_period')
      and grantee in ('authenticated', 'anon') and privilege_type in ('UPDATE', 'INSERT')
  ) then
    raise exception 'pending_card_id / pending_plan_period sont inscriptibles depuis le navigateur.';
  end if;
end $$;

commit;

-- =========================================================================
-- Relevé utile avant et après : profils dont la carte n'a jamais servi.
-- Un `core_card_id` sans aucun paiement COMPLETED peut être une carte
-- abandonnée enregistrée par l'ancien code — à recouper avec l'onglet
-- Cartes / Transactions du dashboard Core avant toute décision :
--
--   select p.id, u.email, p.subscription_status, p.core_card_id
--     from profiles p join auth.users u on u.id = p.id
--    where p.core_card_id is not null
--      and not exists (select 1 from payments y
--                      where y.user_id = p.id and y.status = 'COMPLETED');
-- =========================================================================
