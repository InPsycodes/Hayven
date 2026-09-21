-- Schedules the Paystack reconciliation sweep (E18(b), external PRD review;
-- src/lib/payments/reconciliation.ts) the same way migration 0070 scheduled
-- the notifications cron: pg_cron + pg_net calling the app's own HTTP
-- endpoint, reusing the same vault secrets (cron_target_url, cron_secret) --
-- no new one-time setup needed if 0070's setup already ran.
--
-- Hourly, not every 15 minutes like notifications -- this job isn't
-- latency-sensitive (its own window overlaps run-to-run), and Paystack API
-- calls are slower and worth rate-limiting more conservatively than an
-- in-database notifications sweep.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('reconciliation-cron')
where exists (select 1 from cron.job where jobname = 'reconciliation-cron');

select cron.schedule(
  'reconciliation-cron',
  '0 * * * *',
  $job$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_target_url')
             || '/api/cron/reconciliation',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      timeout_milliseconds := 60000
    );
  $job$
);
