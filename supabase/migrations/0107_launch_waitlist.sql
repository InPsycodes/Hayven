-- Launch waitlist: while no therapist is live in search, /search shows a
-- "we're verifying our first therapists" panel where a parent can leave an
-- email to hear when therapists go live (UI review 2026-10-09).
--
-- Written only by the joinLaunchWaitlist server action (service role);
-- no policies and no grants for anon/authenticated, so the list can't be
-- read or enumerated through the public API. One row per email.
-- notified_at is for whoever sends the "therapists are live" email later;
-- nothing sends it automatically.

create table public.launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  specialty text,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

alter table public.launch_waitlist enable row level security;
revoke all on public.launch_waitlist from anon, authenticated;
grant all privileges on public.launch_waitlist to service_role;
