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
-- CORRECTIF DU 27/09/2026 — premier essai en production refusé par le contrôle
-- ci-dessous : « pending_card_id / pending_plan_period sont inscriptibles depuis
-- le navigateur ». Cause : Supabase accorde TOUS les droits sur chaque table aux
-- rôles `anon` et `authenticated` ; `migration-i18n.sql` n'avait retiré que
-- l'UPDATE sur `profiles`. L'INSERT au niveau de la table subsistait, et
-- s'étend à toute nouvelle colonne. Il n'était pas exploitable — RLS active,
-- aucune policy d'insertion, et chaque profil existe déjà (déclencheur
-- d'inscription) — mais rien ne le justifie : il est retiré ici. Aucun code
-- du navigateur ni des fonctions n'insère dans `profiles` (vérifié par
-- balayage). L'essai local initial n'avait pas reproduit les droits par défaut
-- de Supabase ; il les reproduit désormais.
--
-- ⚠ À exécuter AVANT de redéployer `core-register-card`, `core-charge` et
-- `account-actions` : sans les colonnes, l'enregistrement de carte échoue.
--
-- Idempotent.
-- ============================================================================

begin;

alter table public.profiles add column if not exists pending_card_id     text;
alter table public.profiles add column if not exists pending_plan_period text;

-- Seul le déclencheur d'inscription (security definer) crée un profil.
revoke insert on public.profiles from anon, authenticated;

-- Contrôle : le navigateur ne doit pas pouvoir écrire ces colonnes.
-- Le message nomme les droits fautifs : un échec doit dire quoi corriger.
do $$
declare fautifs text;
begin
  select string_agg(distinct grantee || ' ' || privilege_type || ' (' || column_name || ')', ', ')
    into fautifs
    from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'profiles'
     and column_name in ('pending_card_id', 'pending_plan_period')
     and grantee in ('authenticated', 'anon') and privilege_type in ('UPDATE', 'INSERT');
  if fautifs is not null then
    raise exception 'pending_card_id / pending_plan_period sont inscriptibles depuis le navigateur : %', fautifs;
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
