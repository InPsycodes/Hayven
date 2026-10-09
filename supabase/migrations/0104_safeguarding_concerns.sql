-- Safeguarding concerns log (docs/safeguarding-procedure.md §7 and §9).
--
-- The procedure requires safeguarding records to live where only the DSL
-- and Deputy DSL can reach them -- never in a table a therapist,
-- supervisor, or parent session can touch, even through a policy bug.
-- So, unlike every other clinical table, these have NO policies and NO
-- grant to `authenticated` or `anon` at all: RLS is enabled with zero
-- policies, privileges are revoked outright, and the only path in is the
-- service-role client from server code (src/lib/safeguarding/), which
-- checks the caller is a designated lead before every read and every
-- decision. Same lockdown shape as audit_log.
--
-- Three tables:
--   safeguarding_leads          -- who the DSL / Deputy DSL are, as accounts
--   safeguarding_concerns       -- one row per concern (raised by staff, or
--                                  auto-flagged when a report is published)
--   safeguarding_concern_events -- append-only trail of every action on a
--                                  concern (§7: what was decided, why, by whom)
--
-- After running this, designate the leads (both must be admin accounts --
-- the admin pages enforce that). Replace the emails with the real ones:
--
--   insert into public.safeguarding_leads (user_id, role)
--   select id, 'dsl' from public.users where email = '<DSL email>';
--   insert into public.safeguarding_leads (user_id, role)
--   select id, 'deputy_dsl' from public.users where email = '<Deputy DSL email>';
--
-- Until at least one lead is designated, the app falls back to every
-- admin (alerts and the /admin/safeguarding page), so a concern is never
-- raised into a void.

create type safeguarding_lead_role as enum ('dsl', 'deputy_dsl');
create type safeguarding_concern_source as enum ('staff_report', 'auto_flag');
create type safeguarding_concern_status as enum ('open', 'monitoring', 'referred', 'closed');
-- The four decisions in procedure §5.2.
create type safeguarding_concern_decision as enum ('monitor', 'contact_family', 'refer_externally', 'immediate_escalation', 'no_action');

alter type notification_type add value if not exists 'safeguarding_concern_new';
alter type notification_type add value if not exists 'safeguarding_concern_actioned';

create table public.safeguarding_leads (
  user_id uuid primary key references public.users(id) on delete cascade,
  role safeguarding_lead_role not null,
  created_at timestamptz not null default now()
);

-- References use `on delete set null`, not cascade: a safeguarding record
-- must outlive the clinical data it refers to (the 6-year clinical purge,
-- src/lib/clinical/purge.ts, deletes therapy_sessions; children rows are
-- anonymised in place, never deleted). Retention for these records is set
-- separately -- see procedure §7, pending counsel.
create table public.safeguarding_concerns (
  id uuid primary key default gen_random_uuid(),
  source safeguarding_concern_source not null,
  raised_by uuid references public.users(id) on delete set null,
  child_id uuid references public.children(id) on delete set null,
  therapy_session_id uuid references public.therapy_sessions(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  immediate_danger boolean not null default false,
  description text not null,
  matched_phrases text[] not null default '{}',
  status safeguarding_concern_status not null default 'open',
  decision safeguarding_concern_decision,
  decision_reasoning text,
  review_date date,
  outcome text,
  handled_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index on public.safeguarding_concerns (status, created_at desc);
create index on public.safeguarding_concerns (raised_by, created_at desc);
-- A report republished after an edit must not raise a second auto-flag for
-- the same session.
create unique index safeguarding_concerns_one_auto_flag_per_session
  on public.safeguarding_concerns (therapy_session_id)
  where source = 'auto_flag';

create table public.safeguarding_concern_events (
  id uuid primary key default gen_random_uuid(),
  concern_id uuid not null references public.safeguarding_concerns(id) on delete restrict,
  actor_id uuid references public.users(id) on delete set null,
  kind text not null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.safeguarding_concern_events (concern_id, created_at);

alter table public.safeguarding_leads enable row level security;
alter table public.safeguarding_concerns enable row level security;
alter table public.safeguarding_concern_events enable row level security;

revoke all on public.safeguarding_leads from anon, authenticated;
revoke all on public.safeguarding_concerns from anon, authenticated;
revoke all on public.safeguarding_concern_events from anon, authenticated;

grant all privileges on public.safeguarding_leads to service_role;
grant all privileges on public.safeguarding_concerns to service_role;
-- The trail is append-only, even for the service role: no update/delete.
grant select, insert on public.safeguarding_concern_events to service_role;
