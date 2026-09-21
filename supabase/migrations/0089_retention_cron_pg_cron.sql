-- Schedules the 6-year clinical/payment retention sweep (E3 follow-up,
-- external PRD review; src/app/api/cron/retention) the same way migrations
-- 0070/0088 scheduled the notifications and reconciliation crons: pg_cron +
-- pg_net calling the app's own HTTP endpoint, reusing the same vault
-- secrets (cron_target_url, cron_secret) -- no new one-time setup needed if
-- 0070's setup already ran.
--
-- Daily, not every 15 minutes or hourly like the other two -- this is
-- yearly-scale housekeeping (6-year clinical/payment windows), and the
-- clinical sweep costs one query per not-yet-purged child, wasted work at
-- a tighter cadence.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('retention-cron')
where exists (select 1 from cron.job where jobname = 'retention-cron');

select cron.schedule(
  'retention-cron',
  '0 3 * * *',
  $job$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_target_url')
             || '/api/cron/retention',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      timeout_milliseconds := 120000
    );
  $job$
);
