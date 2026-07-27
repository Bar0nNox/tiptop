-- =========================================================================
-- Migration — Internationalisation + verrouillage des colonnes de profil
-- À exécuter APRÈS les migrations précédentes. Idempotente.
-- =========================================================================

-- ---- Langue préférée ('fr' | 'en') ----
-- Permet de retrouver sa langue d'un appareil à l'autre : le navigateur ne
-- mémorise le choix que localement. NULL = aucune préférence explicite, on
-- retombe alors sur la détection navigateur.
alter table public.profiles
  add column if not exists lang text check (lang in ('fr', 'en'));

-- =========================================================================
-- ⚠️ CORRECTIF DE SÉCURITÉ (indépendant de l'i18n, découvert à cette occasion)
--
-- La policy « profiles: update own » autorise un utilisateur à modifier SA ligne.
-- Or une policy RLS filtre les LIGNES, pas les COLONNES : en l'état, n'importe
-- quel utilisateur connecté peut modifier n'importe quelle colonne de son profil
-- depuis la console de son navigateur, dont `subscription_status` et
-- `current_period_end` — donc s'octroyer un abonnement gratuit.
--
-- Correctif : restreindre les colonnes modifiables par le rôle `authenticated`
-- à la seule colonne `lang`. Tout le reste (statut d'abonnement, carte, compteur
-- d'essai…) ne peut plus être écrit que par les Edge Functions, qui utilisent la
-- clé de service et ne sont pas soumises à ces restrictions.
-- =========================================================================

revoke update on public.profiles from authenticated;
grant  update (lang) on public.profiles to authenticated;

-- Le rôle anonyme n'a aucune raison d'écrire dans les profils.
revoke update on public.profiles from anon;

-- ---- Vérification (à exécuter après coup, doit ne renvoyer que 'lang') ----
--   select column_name
--     from information_schema.column_privileges
--    where grantee = 'authenticated'
--      and table_name = 'profiles'
--      and privilege_type = 'UPDATE';
