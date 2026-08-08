-- RLS for the progress-report tables. Same idiom as 0002_rls.sql:
-- security definer helpers to avoid repeating joins in every policy, a
-- therapist-owns-row EXISTS check, a parent-owns-row check, and
-- current_user_role() = 'admin' for admin read policies.

-- Resolve "does the calling therapist have an active assignment to this
-- child" once, reused by every table below instead of inlining the join.
create function public.is_assigned_therapist(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_child_assignments tca
    join public.therapist_profiles tp on tp.id = tca.therapist_id
    where tca.child_id = p_child_id
      and tp.user_id = auth.uid()
      and tca.status = 'active'
  );
$$;

create function public.is_parent_of_child(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.children c
    where c.id = p_child_id and c.parent_id = auth.uid()
  );
$$;

alter table public.therapist_child_assignments enable row level security;
alter table public.child_diagnoses            enable row level security;
alter table public.goals                      enable row level security;
alter table public.target_behaviours          enable row level security;
alter table public.skills                     enable row level security;
alter table public.therapy_sessions           enable row level security;
alter table public.session_behaviour_entries  enable row level security;
alter table public.session_skill_entries      enable row level security;
alter table public.session_goal_progress      enable row level security;
alter table public.session_reinforcers        enable row level security;
alter table public.reports                    enable row level security;

-- ---------------------------------------------------------------------------
-- therapist_child_assignments
-- Parents control who's assigned to their child. Therapists may self-assign
-- only where a real confirmed/completed booking already links them to that
-- child -- a bootstrap that grants no more access than the existing
-- booking-inferred "assigned therapists can view children" policy on
-- children already grants; there's no admin assignment console yet.
-- ---------------------------------------------------------------------------

create policy "parent manages assignments for own children" on public.therapist_child_assignments
  for all using (public.is_parent_of_child(child_id));
create policy "therapist views own assignments" on public.therapist_child_assignments
  for select using (
    exists (select 1 from public.therapist_profiles tp
            where tp.id = therapist_child_assignments.therapist_id and tp.user_id = auth.uid())
  );
create policy "therapist self-assigns from a booking" on public.therapist_child_assignments
  for insert with check (
    exists (select 1 from public.therapist_profiles tp
            where tp.id = therapist_child_assignments.therapist_id and tp.user_id = auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.child_id = therapist_child_assignments.child_id
        and b.therapist_id = therapist_child_assignments.therapist_id
        and b.status in ('confirmed', 'completed')
    )
  );
create policy "admins manage all assignments" on public.therapist_child_assignments
  for all using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- child_diagnoses
-- ---------------------------------------------------------------------------

create policy "parent manages own child diagnoses" on public.child_diagnoses
  for all using (public.is_parent_of_child(child_id));
create policy "assigned therapist manages child diagnoses" on public.child_diagnoses
  for all using (public.is_assigned_therapist(child_id));
create policy "admins view all child diagnoses" on public.child_diagnoses
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- goals / target_behaviours / skills
-- Assigned therapist manages; parent gets read-only on goals (the parent
-- dashboard can grow into these later). Parents get no access to
-- target_behaviours / skills -- raw behavioural data is clinical, not
-- parent-facing, matching the PRD's "behaviour frequency is therapist-only"
-- stance for the equivalent chart.
-- ---------------------------------------------------------------------------

create policy "assigned therapist manages goals" on public.goals
  for all using (public.is_assigned_therapist(child_id));
create policy "parent views own child goals" on public.goals
  for select using (public.is_parent_of_child(child_id));
create policy "admins view all goals" on public.goals
  for select using (public.current_user_role() = 'admin');

create policy "assigned therapist manages target behaviours" on public.target_behaviours
  for all using (public.is_assigned_therapist(child_id));
create policy "admins view all target behaviours" on public.target_behaviours
  for select using (public.current_user_role() = 'admin');

create policy "assigned therapist manages skills" on public.skills
  for all using (public.is_assigned_therapist(child_id));
create policy "admins view all skills" on public.skills
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- therapy_sessions -- assigned therapist only in this pass. No parent
-- policy: parents will see the published report once publishing exists,
-- not the raw session (which includes therapist_notes/confidential_note
-- territory) -- adding parent access now would leak ahead of that workflow.
-- ---------------------------------------------------------------------------

create policy "assigned therapist manages therapy sessions" on public.therapy_sessions
  for all using (public.is_assigned_therapist(child_id));
create policy "admins view all therapy sessions" on public.therapy_sessions
  for select using (public.current_user_role() = 'admin');

-- confidential_note: same treatment as verification_requests.reviewer_notes
-- in 0002. Reads/writes go through service-role code that re-checks
-- assignment first (src/lib/therapy-sessions/confidential.ts).
-- IMPORTANT: 0012 must NOT issue a table-wide GRANT SELECT on
-- therapy_sessions, or this revoke is silently undone (see 0003's comment).
revoke select (confidential_note) on public.therapy_sessions from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Per-session entry tables -- inherit access from their parent session.
-- ---------------------------------------------------------------------------

create policy "assigned therapist manages behaviour entries" on public.session_behaviour_entries
  for all using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = session_behaviour_entries.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "admins view all behaviour entries" on public.session_behaviour_entries
  for select using (public.current_user_role() = 'admin');

create policy "assigned therapist manages skill entries" on public.session_skill_entries
  for all using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = session_skill_entries.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "admins view all skill entries" on public.session_skill_entries
  for select using (public.current_user_role() = 'admin');

create policy "assigned therapist manages goal progress" on public.session_goal_progress
  for all using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = session_goal_progress.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "admins view all goal progress" on public.session_goal_progress
  for select using (public.current_user_role() = 'admin');

create policy "assigned therapist manages reinforcers" on public.session_reinforcers
  for all using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = session_reinforcers.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "admins view all reinforcers" on public.session_reinforcers
  for select using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- reports -- assigned therapist (via the session's child) manages. The Edge
-- Function writes bodies via the service-role key, which bypasses RLS
-- entirely, so no separate policy is needed for the generation worker.
-- No parent policy in this pass: parent visibility arrives with publishing.
-- ---------------------------------------------------------------------------

create policy "assigned therapist manages reports" on public.reports
  for all using (
    exists (select 1 from public.therapy_sessions ts
            where ts.id = reports.session_id
              and public.is_assigned_therapist(ts.child_id))
  );
create policy "admins view all reports" on public.reports
  for select using (public.current_user_role() = 'admin');

-- debug_payload can contain raw rejected model output -- internal only.
revoke select (debug_payload) on public.reports from authenticated, anon;
