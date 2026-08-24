-- Supervisors are now granted from therapist accounts, not parent accounts,
-- and a therapist keeps full access to their own practice (caseload,
-- schedule, bookings) after being granted supervisor access -- they don't
-- lose it the way the old role-swap mechanism (users.role -> 'supervisor')
-- would have caused. is_supervisor is an additive flag on a therapist
-- account rather than a role change; every existing RLS function
-- (is_supervisor_of_therapist, is_supervised_child) already keys off
-- supervisor_assignments membership, not users.role, so none of that needs
-- to change for this to work. The 'supervisor' role enum value and the
-- /supervisor/* portal are unchanged -- a plain role='supervisor' account
-- (from the old mechanism, if any exist) keeps working exactly as before;
-- this just adds a second, additive way in.

alter table public.users add column is_supervisor boolean not null default false;

-- A therapist requests supervisor access; an admin approves or denies it.
-- Approving sets users.is_supervisor = true (done in application code, same
-- as every other admin decision in this app -- see setUserAccountStatus,
-- resolveSupportRequest) rather than via a trigger, so the audit-log entry
-- and the flag change happen atomically from one code path.

create type supervisor_request_status as enum ('pending', 'approved', 'denied');

alter type notification_type add value 'supervisor_request_new';
alter type notification_type add value 'supervisor_request_approved';
alter type notification_type add value 'supervisor_request_denied';

create table public.supervisor_requests (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.users(id) on delete cascade,
  note text,
  status supervisor_request_status not null default 'pending',
  admin_id uuid references public.users(id),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index on public.supervisor_requests (status, requested_at);

alter table public.supervisor_requests enable row level security;

create policy "therapists view own supervisor requests" on public.supervisor_requests
  for select using (therapist_id = auth.uid());

-- Same discipline as 0036/0048: pin every admin-owned field to its
-- fresh-submission value at insert time, not just the owner FK, so a
-- therapist can't insert a row that already looks approved.
create policy "therapists create own supervisor request" on public.supervisor_requests
  for insert with check (
    therapist_id = auth.uid()
    and status = 'pending'
    and admin_id is null
    and reviewed_at is null
  );

create policy "admins manage supervisor requests" on public.supervisor_requests
  for all using (public.current_user_role() = 'admin');

grant select, insert on public.supervisor_requests to authenticated;
grant all privileges on public.supervisor_requests to service_role;
