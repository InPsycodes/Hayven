-- Per-user opt-out for the non-transactional notification emails (and their
-- push copies). The bell always shows every notification; these flags only
-- gate the email/push echo. Transactional types (booking confirmed, payment
-- receipt, report published, verification updates, meeting link, support,
-- supervisor, account) have no flag here and are always delivered.
--
-- A row is created lazily the first time a user opens their preferences or
-- clicks an unsubscribe link; missing row == all defaults (opted in).

create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  email_session_reminders boolean not null default true,
  email_messages boolean not null default true,
  email_report_nudges boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "user manages own notification preferences" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.notification_preferences to authenticated;
grant all privileges on public.notification_preferences to service_role;
