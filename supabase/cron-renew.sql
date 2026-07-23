-- =========================================================================
-- Planification du renouvellement automatique
-- À exécuter dans Supabase > SQL Editor APRÈS avoir déployé core-renew
-- et défini le secret CRON_SECRET.
--
-- ⚠️ Remplacer VOTRE_CRON_SECRET par la même valeur que le secret Supabase
--    `CRON_SECRET` (celle passée à `supabase secrets set CRON_SECRET=...`).
-- =========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime une éventuelle planification précédente (ré-exécution sans doublon).
select cron.unschedule('tiptop-renew-daily')
where exists (select 1 from cron.job where jobname = 'tiptop-renew-daily');

-- Exécution quotidienne à 04:00 UTC (heure creuse).
select cron.schedule(
  'tiptop-renew-daily',
  '0 4 * * *',
  $$
  select net.http_post(
    url     := 'https://jlvzpqfafaubxphojoqg.supabase.co/functions/v1/core-renew',
    headers := jsonb_build_object(
                 'Content-Type',   'application/json',
                 'x-cron-secret',  'VOTRE_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- ---- Vérifications utiles ----
-- Planification enregistrée :
--   select jobname, schedule, active from cron.job;
-- Dernières exécutions :
--   select jobid, status, return_message, start_time
--     from cron.job_run_details order by start_time desc limit 10;
-- Déclencher manuellement pour tester (sans attendre 04:00) : rejouer le bloc
-- net.http_post ci-dessus directement dans le SQL Editor.
