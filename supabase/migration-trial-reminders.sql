-- ============================================================================
-- TipTop — migration-trial-reminders.sql            (v1.19.0)
--
-- Relances de fin d'essai. Trois choses :
--   1. Table `trial_emails` — idempotence et mesure de conversion.
--   2. Deux colonnes sur `profiles` — désabonnement.
--   3. Fonction `trial_reminder_targets()` — la sélection des destinataires,
--      tenue en SQL et non dans la Edge Function : auditable, testable au
--      SQL Editor, et la fonction TypeScript reste un simple expéditeur.
--
-- Idempotent. Peut être rejoué sans effet de bord.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Assertions de schéma
--
-- CONTEXTE.md : « les substitutions échouent en silence ». Même principe ici —
-- une colonne absente ferait échouer la fonction plus tard, à l'exécution du
-- cron, sans que personne ne le voie. On échoue maintenant, bruyamment.
-- ---------------------------------------------------------------------------
do $$
declare
  missing text[] := '{}';
  needed  text[] := array[
    'trial_events_used', 'trial_started_at', 'core_card_id',
    'subscription_status', 'current_period_end', 'lang',
    'cancel_at_period_end'
  ];
  col text;
begin
  foreach col in array needed loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = col
    ) then
      missing := missing || col;
    end if;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception
      'Colonnes absentes de public.profiles : %. Vérifier le schéma avant de poursuivre.',
      array_to_string(missing, ', ');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Journal des envois
--
-- L'unicité (user_id, kind) est le mécanisme d'idempotence : la Edge Function
-- insère AVANT d'envoyer. Une réexécution du cron dans la même journée, ou deux
-- exécutions concurrentes, se heurtent à la contrainte plutôt que d'envoyer
-- deux fois. Même posture que `payments`.
-- ---------------------------------------------------------------------------
create table if not exists public.trial_emails (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  kind         text        not null check (kind in ('d7', 'd3', 'd0', 'p3')),
  variant      text        not null check (variant in ('cold', 'warm')),
  lang         text        not null,
  sent_at      timestamptz not null default now(),
  provider_id  text,                       -- id Resend, renseigné après envoi
  constraint trial_emails_user_kind_unique unique (user_id, kind)
);

comment on table public.trial_emails is
  'Un enregistrement par relance d''essai envoyée. L''unicité (user_id, kind) '
  'garantit qu''une relance donnée ne part qu''une fois. Sert aussi à mesurer '
  'la conversion par échéance.';

create index if not exists trial_emails_sent_at_idx on public.trial_emails (sent_at);

-- PAS D'INDEX sur `current_period_end::date`. La conversion d'un `timestamptz`
-- en `date` dépend du fuseau de la session : elle est STABLE, pas IMMUTABLE, et
-- Postgres refuse une telle expression dans un index
-- (« functions in index expression must be marked IMMUTABLE »).
--
-- L'écrire `(current_period_end at time zone 'UTC')::date` serait indexable,
-- mais l'expression ne correspondrait plus au prédicat de la fonction et
-- l'index resterait inutilisé.
--
-- Sans objet en pratique : `profiles` compte une ligne par utilisateur et la
-- sélection tourne une fois par jour. Un parcours séquentiel y est négligeable,
-- et le restera longtemps.

-- Aucune policy : RLS active sans policy = aucun accès client. Les Edge
-- Functions passent en clé de service et ne sont pas soumises à RLS.
alter table public.trial_emails enable row level security;
revoke all on public.trial_emails from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Désabonnement
--
-- Ces deux colonnes sont écrites EXCLUSIVEMENT par la Edge Function
-- `unsubscribe`, en clé de service. Aucun `grant update` n'est donc accordé :
-- la liste blanche du §6 du roadmap reste intacte — `authenticated` ne peut
-- toujours écrire que `profiles(lang)`.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists trial_emails_opt_out boolean not null default false;

-- gen_random_uuid() est volatile : chaque ligne existante reçoit une valeur
-- distincte lors de la réécriture de table.
alter table public.profiles
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_key
  on public.profiles (unsubscribe_token);

comment on column public.profiles.trial_emails_opt_out is
  'Le client a demandé à ne plus recevoir de relance d''essai. Écrit par la '
  'Edge Function `unsubscribe` uniquement.';
comment on column public.profiles.unsubscribe_token is
  'Jeton porté par le lien de désabonnement des e-mails. Opaque, non devinable, '
  'ne permet que le désabonnement.';

-- Vérification explicite : les nouvelles colonnes ne doivent pas être
-- accessibles en écriture au client.
do $$
declare leaked text;
begin
  select string_agg(column_name, ', ') into leaked
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'profiles'
    and grantee in ('anon', 'authenticated')
    and privilege_type = 'UPDATE'
    and column_name in ('trial_emails_opt_out', 'unsubscribe_token');

  if leaked is not null then
    raise exception
      'Droit UPDATE accordé au client sur : %. À révoquer — cf. §6 du roadmap.',
      leaked;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Sélection des destinataires
--
-- Ancrée sur `current_period_end::date`, JAMAIS sur le statut seul.
-- Raison : `core-renew` tourne à 04:00 UTC et ne bascule un profil que si
-- `current_period_end` est effectivement atteint. Un essai dont l'échéance
-- tombe à 10:00 UTC est donc encore `trialing` toute la journée du J-0 et ne
-- passe `inactive` que le lendemain à 04:00. L'heure de bascule dépend de
-- l'heure d'inscription : le statut est un signal instable, la date ne l'est pas.
--
-- Le statut n'intervient qu'en garde-fou :
--   · d7/d3/d0 exigent `trialing`  — quelqu'un déjà basculé ne doit pas
--     recevoir « il vous reste 3 jours ».
--   · p3 exige `inactive`          — si `core-renew` a échoué, le profil est
--     encore `trialing` et « votre essai est terminé » serait faux. On
--     s'abstient plutôt que d'écrire une contre-vérité.
--
-- `core_card_id is null` ne suffit PAS à isoler un essai non converti. À la
-- résiliation, `account-actions` supprime la carte chez Core et remet
-- `core_card_id` à NULL ; `core-renew` bascule ensuite le compte en `inactive`
-- sans toucher à `current_period_end`. Trois jours plus tard, un ancien abonné
-- résilié présente donc exactement la même signature qu'un essai expiré — et
-- recevrait « votre essai est terminé ». Deux filtres supplémentaires :
--   · `cancel_at_period_end = false` — vrai uniquement après une résiliation.
--   · aucun paiement `COMPLETED`     — n'a jamais rien payé. Le statut
--     `COMPLETED` et non l'existence d'une ligne : un prélèvement échoué
--     pendant l'essai ne doit pas priver le client de ses relances.
create or replace function public.trial_reminder_targets()
returns table (
  user_id           uuid,
  email             text,
  lang              text,
  kind              text,
  variant           text,
  unsubscribe_token uuid,
  period_end        date
)
language sql
security definer
set search_path = public, auth
as $fn$
  with candidate as (
    select
      p.id,
      u.email::text                                   as email,
      case when p.lang = 'fr' then 'fr' else 'en' end  as lang,
      p.unsubscribe_token,
      p.current_period_end::date                       as period_end,
      p.trial_events_used,
      p.subscription_status,
      case p.current_period_end::date
        when current_date + 7 then 'd7'
        when current_date + 3 then 'd3'
        when current_date     then 'd0'
        when current_date - 3 then 'p3'
      end                                              as kind
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.trial_emails_opt_out = false
      and p.trial_started_at is not null
      and p.core_card_id is null
      and coalesce(p.cancel_at_period_end, false) = false
      and p.current_period_end is not null
      and u.email is not null
      and u.deleted_at is null
      and p.current_period_end::date in (
            current_date + 7, current_date + 3, current_date, current_date - 3
          )
      and not exists (
        select 1 from public.payments pay
        where pay.user_id = p.id and pay.status = 'COMPLETED'
      )
  )
  select
    c.id,
    c.email,
    c.lang,
    c.kind,
    -- `cold` : aucun événement créé sur toute la durée de l'essai. Le frein
    -- est le démarrage, pas le prix — d'où un contenu distinct.
    case when coalesce(c.trial_events_used, 0) = 0 then 'cold' else 'warm' end,
    c.unsubscribe_token,
    c.period_end
  from candidate c
  where c.kind is not null
    -- Le J-7 ne part qu'à qui n'a pas commencé. À qui a déjà créé son plan,
    -- il n'annoncerait rien : l'échéance est encore à une semaine.
    and (c.kind <> 'd7' or coalesce(c.trial_events_used, 0) = 0)
    and (
      (c.kind in ('d7', 'd3', 'd0') and c.subscription_status = 'trialing')
      or
      (c.kind = 'p3' and c.subscription_status = 'inactive')
    )
    and not exists (
      select 1 from public.trial_emails te
      where te.user_id = c.id and te.kind = c.kind
    );
$fn$;

comment on function public.trial_reminder_targets() is
  'Destinataires des relances d''essai pour la journée courante. security '
  'definer car elle lit auth.users — donc EXECUTE révoqué à anon et '
  'authenticated : la fonction expose des adresses e-mail.';

-- security definer + lecture de auth.users : l'exécution doit être réservée à
-- la clé de service. Sans cette révocation, n'importe quel client connecté
-- énumérerait les adresses de tous les comptes en essai.
revoke all on function public.trial_reminder_targets() from public, anon, authenticated;
grant execute on function public.trial_reminder_targets() to service_role;

commit;

-- ============================================================================
-- Contrôles après exécution
-- ============================================================================
--
-- Destinataires du jour, sans rien envoyer :
--   select * from public.trial_reminder_targets();
--
-- Simuler une échéance pour un compte de test (à J-3) :
--   update public.profiles
--      set current_period_end = now() + interval '3 days',
--          subscription_status = 'trialing'
--    where id = '<uuid>';
--
-- Rejouer une relance déjà envoyée :
--   delete from public.trial_emails where user_id = '<uuid>' and kind = 'd3';
--
-- Taux d'envoi par échéance :
--   select kind, variant, count(*) from public.trial_emails
--    group by 1, 2 order by 1, 2;
-- ============================================================================
