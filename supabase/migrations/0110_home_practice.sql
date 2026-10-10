-- Home practice check-in.
--
-- A therapist's "What should we practise at home?" answer becomes up to
-- three activities the parent can log tries against during the week; the
-- therapist reads those tries and notes before the next session.
--
-- Access: like the safeguarding tables (0104), these have RLS enabled with
-- no policies and no grants to anon/authenticated. Every read and write
-- goes through server code (src/lib/home-practice/) using the service-role
-- client, which checks first that the caller is the child's parent or a
-- therapist actively assigned to the child. Parent notes can be personal,
-- and this keeps them away from any client-side query path.

create type home_practice_status as enum ('active', 'done', 'replaced');
create type home_practice_next_step as enum ('keep', 'change');
create type home_practice_outcome as enum ('good', 'mixed', 'hard');

create table public.home_practice_activities (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  -- The session that set it. Kept if the session row is ever removed.
  therapy_session_id uuid references public.therapy_sessions(id) on delete set null,
  set_on date not null,
  body text not null check (char_length(body) between 1 and 500),
  position smallint not null default 1 check (position between 1 and 3),
  status home_practice_status not null default 'active',
  -- The therapist's choice for what happens at their next session:
  -- 'keep' carries it over, 'change' (or no choice) replaces it.
  next_step home_practice_next_step,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index home_practice_activities_child_status on public.home_practice_activities (child_id, status);
create index home_practice_activities_reminder on public.home_practice_activities (status, reminded_at, created_at);

create table public.home_practice_logs (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.home_practice_activities(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  logged_by uuid not null references public.users(id) on delete cascade,
  -- The Lagos calendar day the try happened. One try per activity per day;
  -- logging again the same day updates it.
  logged_on date not null,
  outcome home_practice_outcome not null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, logged_on)
);

create index home_practice_logs_child on public.home_practice_logs (child_id, logged_on desc);

alter table public.home_practice_activities enable row level security;
alter table public.home_practice_logs enable row level security;

revoke all on public.home_practice_activities from anon, authenticated;
revoke all on public.home_practice_logs from anon, authenticated;

grant all privileges on public.home_practice_activities to service_role;
grant all privileges on public.home_practice_logs to service_role;

-- The midweek reminder, and the parent's switch to turn it off.
alter type notification_type add value if not exists 'home_practice_reminder';

alter table public.notification_preferences
  add column if not exists email_home_practice boolean not null default true;
