-- ============================================================================
-- TipTop — migration-readonly-inactive.sql              (v1.19.0)
--
-- Un propriétaire dont l'abonnement n'est plus actif peut de nouveau LIRE ses
-- événements. L'écriture reste fermée.
--
-- LE DÉFAUT CORRIGÉ
-- `has_active_subscription()` ne renvoie vrai que pour `active` et `trialing`,
-- et la policy de lecture l'exigeait pour le propriétaire lui-même. En
-- `inactive`, un `select` sur `events` renvoyait donc zéro ligne — sans erreur,
-- donc sans message. Le tableau de bord affichait une grille vide et rien
-- n'indiquait que les plans existaient toujours. Vérifié au navigateur le
-- 30/07/2026 : les événements disparaissent purement et simplement.
--
-- L'effet arrivait au pire moment : à l'expiration de l'essai, quand le client
-- décide de s'abonner ou non, il constatait que son travail avait disparu.
--
-- CE QUI NE CHANGE PAS
--   · Écriture (`events: update own or placer`) — toujours conditionnée à
--     `has_active_subscription()` pour le propriétaire.
--   · Création (`events: insert own`) — idem.
--   · Accès des collaborateurs — la seconde branche de la policy est reprise
--     mot pour mot. Elle exige `owner_has_active_paid_subscription()` : les
--     collaborateurs d'un compte expiré restent exclus, comme prévu depuis la
--     v1.5.x. C'est le point à vérifier explicitement au navigateur.
--   · Suppression — `events: delete own` ne demandait déjà aucun abonnement.
--     Volontaire : pouvoir effacer ses propres données ne se conditionne pas
--     à un paiement.
--
-- Idempotent.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Assertions préalables
--
-- La policy est recréée à partir de son texte de la v1.18.1. Si celui-ci a
-- changé entre-temps, la réécrire à l'aveugle effacerait la modification. On
-- vérifie donc que les deux fonctions attendues sont bien là, et que la policy
-- porte le nom prévu.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'my_collab_role') then
    raise exception 'Fonction my_collab_role() absente — exécuter migration-collab.sql d''abord.';
  end if;
  if not exists (select 1 from pg_proc where proname = 'owner_has_active_paid_subscription') then
    raise exception 'Fonction owner_has_active_paid_subscription() absente — exécuter migration-collab.sql d''abord.';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events'
      and policyname = 'events: select own or shared'
  ) then
    raise exception
      'Policy « events: select own or shared » introuvable. Le nom ou l''état '
      'des policies diffère de la v1.18.1 : vérifier avant de poursuivre '
      '(select policyname, cmd from pg_policies where tablename = ''events'').';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Lecture : propriétaire QUEL QUE SOIT SON STATUT, ou collaborateur d'un
-- événement dont le propriétaire est abonné actif payant.
-- ---------------------------------------------------------------------------
drop policy if exists "events: select own or shared" on public.events;
create policy "events: select own or shared" on public.events
  for select using (
    -- Changement de la v1.19.0 : `and public.has_active_subscription()` retiré
    -- de cette branche. Un propriétaire lit toujours ses propres événements.
    (auth.uid() = owner_id)
    or (
      -- Inchangé. Les collaborateurs d'un compte expiré perdent l'accès.
      public.my_collab_role(events.id) is not null
      and public.owner_has_active_paid_subscription(events.id)
    )
  );

commit;

-- ============================================================================
-- Contrôles
--
-- ⚠️ Les tests de permission ne valent RIEN depuis le SQL Editor : il s'exécute
-- en rôle de service, `auth.uid()` y est nul et RLS est inactif. Les trois
-- vérifications ci-dessous se font AU NAVIGATEUR, avec de vrais comptes.
-- ============================================================================
--
-- État des policies après migration :
--   select policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and tablename = 'events' order by cmd;
--   → seule la policy SELECT doit avoir changé.
--
-- 1. PROPRIÉTAIRE EXPIRÉ — doit voir ses événements, sans pouvoir les modifier.
--      update profiles set subscription_status = 'inactive' where email = '<test>';
--    Tableau de bord : les cartes réapparaissent, marquées « Lecture seule ».
--    Éditeur : le plan s'affiche, aucun outil d'édition, bandeau d'expiration.
--    Export PNG et impression : doivent fonctionner.
--
-- 2. COLLABORATEUR D'UN COMPTE EXPIRÉ — ne doit RIEN voir.
--    Avec le compte du point 1 toujours en `inactive`, ouvrir l'événement
--    partagé depuis le compte collaborateur, en navigation privée.
--    Attendu : événement introuvable. C'est le risque principal de cette
--    migration — ouvrir la lecture au propriétaire ne doit pas la rouvrir aux
--    tiers.
--
-- 3. RESTAURATION
--      update profiles set subscription_status = '<valeur d''origine>'
--       where email = '<test>';
-- ============================================================================
