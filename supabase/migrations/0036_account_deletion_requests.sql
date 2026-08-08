-- Account deletion requests: a user submits one, an admin reviews it in a
-- queue and marks it reviewed/actioned. This table only ever records that a
-- request happened -- no code anywhere reads this table to actually delete
-- anything. The real deletion of a user's data (which likely cascades into
-- their children's clinical records, still needed by a treating therapist,
-- and may carry its own retention obligations) stays a deliberate, manual,
-- out-of-band admin operation, not something this feature automates.

create type account_deletion_request_status as enum ('pending', 'reviewed', 'actioned');

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reason text,
  status account_deletion_request_status not null default 'pending',
  admin_id uuid references public.users(id),
  admin_notes text, -- INTERNAL ONLY -- never select this column for user-facing queries
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.account_deletion_requests enable row level security;

create policy "users view own deletion requests" on public.account_deletion_requests
  for select using (user_id = auth.uid());

-- Same discipline as 0019's verification-request fix: pin every admin-owned
-- field to its fresh-submission value at insert time, not just the owner FK,
-- so a user can't insert a row that already looks reviewed/actioned.
create policy "users create own deletion request" on public.account_deletion_requests
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and admin_id is null
    and reviewed_at is null
  );

create policy "admins manage deletion requests" on public.account_deletion_requests
  for all using (public.current_user_role() = 'admin');

-- This table is created after 0003's one-time grant loop, so it needs its
-- own explicit grants. admin_notes gets the same column-scoped lockdown as
-- verification_requests.reviewer_notes -- admin review code reads it via the
-- service-role client only, never the authenticated/anon grant path.
grant select (
  id, user_id, reason, status, admin_id, requested_at, reviewed_at
) on public.account_deletion_requests to authenticated;
grant insert on public.account_deletion_requests to authenticated;
grant all privileges on public.account_deletion_requests to service_role;

revoke select (admin_notes) on public.account_deletion_requests from authenticated, anon;
