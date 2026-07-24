-- =========================================================================
-- Migration — Onglet « Mon compte »
-- À exécuter APRÈS les migrations précédentes. Idempotente.
-- =========================================================================

-- Résiliation à effet différé : l'accès est maintenu jusqu'à la fin de la période
-- déjà payée, puis le compte bascule en 'inactive'. Ce marqueur distingue
-- « résilié, encore actif jusqu'à l'échéance » de « actif et reconduit ».
alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false;

-- Date de la demande de résiliation (traçabilité, affichage, support client).
alter table public.profiles
  add column if not exists canceled_at timestamptz;

-- =========================================================================
-- RAPPEL DU CYCLE DE VIE (mis à jour)
--   trialing  → essai, sans carte. À l'échéance : 'inactive'.
--   active    → abonnement payé. À l'échéance :
--                 · cancel_at_period_end = false → prélèvement, période avancée
--                 · cancel_at_period_end = true  → 'inactive', aucun prélèvement
--   past_due  → prélèvement échoué, nouvelle tentative programmée.
--   inactive  → essai terminé ou abonnement résilié / expiré.
--   canceled  → abandon après échecs répétés de prélèvement.
-- =========================================================================
