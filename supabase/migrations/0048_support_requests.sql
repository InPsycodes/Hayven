-- In-app customer support: a user submits a request, every admin gets
-- notified (in-app + email, via the existing createNotification wiring),
-- and an admin's reply is sent back to the requester the same way once
-- resolved. Same ownership/RLS shape as account_deletion_requests (0036),
-- except `resolution` is deliberately user-facing (it's the actual answer
-- being given), so it doesn't get that table's admin_notes column lockdown.

create type support_request_status as enum ('open', 'resolved');

alter type notification_type add value 'support_request_new';
alter type notification_type add value 'support_request_resolved';

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status support_request_status not null default 'open',
  admin_id uuid references public.users(id),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.support_requests (status, created_at);

alter table public.support_requests enable row level security;

create policy "users view own support requests" on public.support_requests
  for select using (user_id = auth.uid());

-- Same discipline as 0036: pin every admin-owned field to its
-- fresh-submission value at insert time, not just the owner FK, so a user
-- can't insert a row that already looks resolved.
create policy "users create own support request" on public.support_requests
  for insert with check (
    user_id = auth.uid()
    and status = 'open'
    and admin_id is null
    and resolution is null
    and resolved_at is null
  );

create policy "admins manage support requests" on public.support_requests
  for all using (public.current_user_role() = 'admin');

grant select, insert on public.support_requests to authenticated;
grant all privileges on public.support_requests to service_role;
