-- =========================================================================
-- Planification des relances de fin d'essai
-- À exécuter dans Supabase > SQL Editor APRÈS avoir déployé trial-reminders.
--
-- ⚠️ Remplacer VOTRE_CRON_SECRET par la même valeur que le secret Supabase
--    `CRON_SECRET` — celui-là même qu'utilise déjà `cron-renew.sql`. Le secret
--    est partagé entre les deux tâches : une seule valeur à faire tourner le
--    jour où il faudra la changer.
-- =========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime une éventuelle planification précédente (ré-exécution sans doublon).
select cron.unschedule('tiptop-trial-reminders-daily')
where exists (select 1 from cron.job where jobname = 'tiptop-trial-reminders-daily');

-- Exécution quotidienne à 08:00 UTC — quatre heures APRÈS `core-renew` (04:00).
--
-- L'ordre n'est pas indifférent : `core-renew` bascule les essais échus en
-- `inactive`, et la relance J+3 exige ce statut. Tourner avant lui ferait
-- manquer une partie des destinataires. Quatre heures couvrent largement une
-- exécution de `core-renew`, ses 50 profils par lot et ses appels à Core.
--
-- Pas de fuseau par destinataire : on n'en stocke aucun, et avec une clientèle
-- internationale aucune heure ne conviendrait à tous. 08:00 UTC place l'envoi
-- en matinée européenne, marché principal.
select cron.schedule(
  'tiptop-trial-reminders-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url     := 'https://jlvzpqfafaubxphojoqg.supabase.co/functions/v1/trial-reminders',
    headers := jsonb_build_object(
                 'Content-Type',   'application/json',
                 'x-cron-secret',  'VOTRE_CRON_SECRET'
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- ---- Vérifications utiles ----
-- Les deux tâches et leur ordre :
--   select jobname, schedule, active from cron.job order by schedule;
--   → tiptop-renew-daily            0 4 * * *
--   → tiptop-trial-reminders-daily  0 8 * * *
--
-- Dernières exécutions (le statut ne dit que le succès de l'appel SQL, pas
-- celui de la fonction) :
--   select jobid, status, return_message, start_time
--     from cron.job_run_details order by start_time desc limit 10;
--
-- Réponses HTTP réellement reçues — c'est ici qu'on voit un 401 (mauvais
-- secret) ou un 409 (garde-fou de gabarit non renseigné) :
--   select created, status_code, content from net._http_response
--    order by created desc limit 10;
--
-- Destinataires du jour, sans rien envoyer :
--   select * from public.trial_reminder_targets();
--
-- Déclencher manuellement pour tester : rejouer le bloc net.http_post ci-dessus
-- directement dans le SQL Editor.
