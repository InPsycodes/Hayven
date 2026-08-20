-- Parent notification feature: report-published/-reminder and
-- session-started/-finished alerts, plus real Web Push delivery.
--
-- entity_type/entity_id let a cron job answer "has this exact event already
-- been notified" (e.g. "does a session_started notification already exist
-- for booking X") without adding one-off dedup columns to bookings/reports
-- -- reports in particular already has a tamper-fix history (0051), so its
-- grants/RLS are deliberately left untouched here.

alter type notification_type add value 'report_published';
alter type notification_type add value 'report_reminder';
alter type notification_type add value 'session_started';
alter type notification_type add value 'session_finished';

alter table public.notifications
  add column entity_type text,
  add column entity_id uuid;

create index on public.notifications (entity_type, entity_id, type);

-- One row per browser/device a parent has enabled push on. Written by the
-- user's own RLS-bound session when they subscribe/unsubscribe; read by the
-- service-role client when actually sending (createNotification's push
-- step), same split as notifications itself.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Explicit using + with check on both, rather than relying on FOR ALL's
-- implicit with-check-mirrors-using behavior -- same explicitness this
-- codebase settled on after 0032-0037.
create policy "user manages own push subscriptions" on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.push_subscriptions to authenticated;
grant all privileges on public.push_subscriptions to service_role;
