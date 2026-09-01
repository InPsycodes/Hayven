-- Move the notifications cron onto pg_cron + pg_net so it runs inside the
-- database on a real scheduler, instead of depending on a GitHub Actions
-- scheduled workflow (those runs are routinely delayed 10-20 min or skipped
-- under GitHub load). It still just calls the same HTTP endpoint every
-- 15 minutes -- the actual work is TypeScript in the Next app.
--
-- The GitHub Actions workflow is kept as an hourly backstop; every cron
-- task dedups its own work, so a double run is harmless.
--
-- ONE-TIME SETUP (run these in the SQL editor with the real values, they
-- are NOT committed):
--   select vault.create_secret('https://hayven.com.ng', 'cron_target_url');
--   select vault.create_secret('<your CRON_SECRET>',    'cron_secret');
-- To rotate later: select vault.update_secret(
--   (select id from vault.secrets where name = 'cron_secret'), '<new value>');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop a previous version of the job before re-creating it.
select cron.unschedule('notifications-cron')
where exists (select 1 from cron.job where jobname = 'notifications-cron');

select cron.schedule(
  'notifications-cron',
  '*/15 * * * *',
  $job$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_target_url')
             || '/api/cron/notifications',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      timeout_milliseconds := 20000
    );
  $job$
);
