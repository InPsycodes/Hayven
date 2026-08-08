-- Intelligent Child Progress Report Generator -- Phase 1 validation slice.
-- Additive: the existing session_notes / progress_goals flow
-- (/therapist/sessions/[bookingId]/report) is untouched by this migration
-- and keeps working exactly as it does today.
--
-- Column shapes follow the PRD's data model section, which is normative.
-- Two deliberate deviations: table names are pluralised and `session` is
-- renamed `therapy_sessions` to match this repo's existing convention and
-- avoid colliding with this codebase's own "session" vocabulary
-- (getSession(), AppSession -- unrelated, auth-only concepts already used
-- pervasively). `reports.therapist_body`/`parent_body` are jsonb per the
-- PRD's own report-body schema section, not plain text.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type assignment_status as enum ('active', 'ended');
create type goal_status as enum ('active', 'met', 'paused', 'discontinued');
create type behaviour_direction as enum ('increase', 'decrease');
create type behaviour_measurement as enum ('frequency', 'duration', 'intensity', 'percent', 'latency');
create type prompt_level as enum ('independent', 'gestural', 'verbal', 'partial_physical', 'full_physical');
create type therapy_session_status as enum ('draft', 'complete');
create type report_status as enum ('generating', 'draft', 'in_review', 'approved', 'published', 'failed');

-- Shared updated_at trigger -- this schema doesn't have one yet.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. therapist_child_assignments -- formalises "assigned therapist", which
-- the existing children RLS policy currently only infers from bookings.
-- ---------------------------------------------------------------------------

create table public.therapist_child_assignments (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  therapy_type text,
  status assignment_status not null default 'active',
  started_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now()
);
create unique index therapist_child_assignments_active_uniq
  on public.therapist_child_assignments (therapist_id, child_id) where status = 'active';
create index on public.therapist_child_assignments (child_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- 2. child_diagnoses -- feeds the LLM payload (diagnosis labels only, never
-- sent verbatim beyond the label).
-- ---------------------------------------------------------------------------

create table public.child_diagnoses (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  label text not null,
  coded_value text,
  diagnosed_by text,
  diagnosed_on date,
  is_self_reported boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.child_diagnoses (child_id);

-- ---------------------------------------------------------------------------
-- 3. goals / target_behaviours / skills -- the child's clinical programme
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  therapist_id uuid not null references public.therapist_profiles(id),
  title text not null,
  description text,
  domain text,
  baseline_value text,
  target_value text,
  unit text,
  status goal_status not null default 'active',
  met_on date,
  created_at timestamptz not null default now()
);
create index on public.goals (child_id);

create table public.target_behaviours (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  label text not null,
  definition text,
  direction behaviour_direction not null default 'decrease',
  measurement behaviour_measurement not null default 'frequency',
  is_active boolean not null default true
);
create index on public.target_behaviours (child_id) where is_active;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  label text not null,
  mastery_criteria text,
  current_percent numeric,
  is_active boolean not null default true
);
create index on public.skills (child_id) where is_active;

-- ---------------------------------------------------------------------------
-- 4. therapy_sessions -- renamed from the PRD's bare `session`. Child-scoped
-- entry point (per the PRD's /therapist/children/[childId]/sessions/new),
-- not booking-scoped -- booking_id is nullable so ad-hoc sessions work but a
-- session can still link back to a real paid appointment when there is one.
-- confidential_note is column-revoked below: internal only, never sent to
-- the report generator, never shown to a parent.
-- ---------------------------------------------------------------------------

create table public.therapy_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  therapist_id uuid not null references public.therapist_profiles(id),
  booking_id uuid references public.bookings(id) on delete set null,
  session_date date not null default current_date,
  duration_minutes integer,
  therapy_type text,
  setting session_type,
  status therapy_session_status not null default 'draft',
  therapist_notes text,
  confidential_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.therapy_sessions (child_id, session_date desc);
create index on public.therapy_sessions (therapist_id);
create unique index therapy_sessions_booking_uniq
  on public.therapy_sessions (booking_id) where booking_id is not null;
create trigger therapy_sessions_touch before update on public.therapy_sessions
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Per-session entry tables
-- ---------------------------------------------------------------------------

create table public.session_behaviour_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.therapy_sessions(id) on delete cascade,
  target_behaviour_id uuid not null references public.target_behaviours(id) on delete cascade,
  count integer,
  duration_seconds integer,
  intensity smallint check (intensity is null or intensity between 1 and 5),
  antecedent text,
  consequence text,
  notes text,
  unique (session_id, target_behaviour_id)
);

create table public.session_skill_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.therapy_sessions(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  trials_total integer,
  trials_correct integer,
  prompt_level prompt_level,
  notes text,
  unique (session_id, skill_id),
  constraint session_skill_entries_trials_sane
    check (trials_correct is null or trials_total is null or trials_correct <= trials_total)
);

create table public.session_goal_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.therapy_sessions(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  percent_complete integer not null check (percent_complete between 0 and 100),
  note text,
  unique (session_id, goal_id)
);

create table public.session_reinforcers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.therapy_sessions(id) on delete cascade,
  label text not null,
  effectiveness smallint check (effectiveness is null or effectiveness between 1 and 5),
  notes text
);
create index on public.session_reinforcers (session_id);

-- ---------------------------------------------------------------------------
-- 6. reports -- therapist_body only is populated in this pass; parent_body,
-- approval, and publishing columns exist now so no breaking migration is
-- needed when those steps are scoped later. debug_payload is column-revoked
-- below (rejected raw model output; internal only).
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.therapy_sessions(id) on delete cascade,
  status report_status not null default 'generating',
  therapist_body jsonb,
  parent_body jsonb,
  model_version text,
  prompt_version text,
  generation_ms integer,
  input_snapshot jsonb,
  token_usage jsonb,
  attempt_count integer not null default 0,
  error_code text,
  error_message text,
  debug_payload jsonb,
  requested_by uuid references public.users(id),
  generated_at timestamptz,
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.reports (session_id);
create index on public.reports (status) where status = 'generating';
create trigger reports_touch before update on public.reports
  for each row execute procedure public.touch_updated_at();
