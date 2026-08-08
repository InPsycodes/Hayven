-- "Care team" access model, part 1 of 2 (part 2 -- clinic admin / supervisor
-- roles, an assign-therapist UI, and audit logging -- is a separate, larger
-- initiative and is deliberately not part of this migration).
--
-- Resolves the open finding from the security audit: is_assigned_therapist()
-- only proves the caller is *some* therapist assigned to the child, so two
-- therapists sharing a case (e.g. an ABA therapist and a speech therapist)
-- could previously read AND EDIT each other's clinical documentation. The
-- decided model: the whole care team can read everything for coordination,
-- but a therapist's own session-level documentation can only be created,
-- edited, or deleted by that therapist -- mirroring how the older
-- session_notes system already behaves, and matching "separate session
-- notes per therapist without overwriting."
--
-- target_behaviours and skills are deliberately left untouched: they have
-- no therapist_id column at all -- they're the child's shared clinical
-- vocabulary (a behaviour or skill being tracked), not any one therapist's
-- note, so "own-only write" doesn't apply to them.

create function public.is_own_therapy_session(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapy_sessions ts
    join public.therapist_profiles tp on tp.id = ts.therapist_id
    where ts.id = p_session_id and tp.user_id = auth.uid()
  );
$$;
grant execute on function public.is_own_therapy_session(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages goals" on public.goals;
create policy "assigned therapist views goals" on public.goals
  for select using (public.is_assigned_therapist(child_id));
create policy "therapist creates own goals" on public.goals
  for insert with check (
    public.is_assigned_therapist(child_id)
    and exists (select 1 from public.therapist_profiles tp where tp.id = goals.therapist_id and tp.user_id = auth.uid())
  );
create policy "therapist edits own goals" on public.goals
  for update using (
    exists (select 1 from public.therapist_profiles tp where tp.id = goals.therapist_id and tp.user_id = auth.uid())
  );
create policy "therapist deletes own goals" on public.goals
  for delete using (
    exists (select 1 from public.therapist_profiles tp where tp.id = goals.therapist_id and tp.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- therapy_sessions
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages therapy sessions" on public.therapy_sessions;
create policy "assigned therapist views therapy sessions" on public.therapy_sessions
  for select using (public.is_assigned_therapist(child_id));
create policy "therapist creates own therapy sessions" on public.therapy_sessions
  for insert with check (
    public.is_assigned_therapist(child_id)
    and exists (select 1 from public.therapist_profiles tp where tp.id = therapy_sessions.therapist_id and tp.user_id = auth.uid())
  );
create policy "therapist edits own therapy sessions" on public.therapy_sessions
  for update using (
    exists (select 1 from public.therapist_profiles tp where tp.id = therapy_sessions.therapist_id and tp.user_id = auth.uid())
  );
create policy "therapist deletes own therapy sessions" on public.therapy_sessions
  for delete using (
    exists (select 1 from public.therapist_profiles tp where tp.id = therapy_sessions.therapist_id and tp.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- session_behaviour_entries / session_skill_entries / session_goal_progress
-- / session_reinforcers -- all keyed by session_id, ownership inherited from
-- the parent therapy_sessions row via is_own_therapy_session().
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages behaviour entries" on public.session_behaviour_entries;
create policy "assigned therapist views behaviour entries" on public.session_behaviour_entries
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_behaviour_entries.session_id and public.is_assigned_therapist(ts.child_id))
  );
create policy "therapist manages own behaviour entries" on public.session_behaviour_entries
  for insert with check (public.is_own_therapy_session(session_id));
create policy "therapist updates own behaviour entries" on public.session_behaviour_entries
  for update using (public.is_own_therapy_session(session_id));
create policy "therapist deletes own behaviour entries" on public.session_behaviour_entries
  for delete using (public.is_own_therapy_session(session_id));

drop policy "assigned therapist manages skill entries" on public.session_skill_entries;
create policy "assigned therapist views skill entries" on public.session_skill_entries
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_skill_entries.session_id and public.is_assigned_therapist(ts.child_id))
  );
create policy "therapist manages own skill entries" on public.session_skill_entries
  for insert with check (public.is_own_therapy_session(session_id));
create policy "therapist updates own skill entries" on public.session_skill_entries
  for update using (public.is_own_therapy_session(session_id));
create policy "therapist deletes own skill entries" on public.session_skill_entries
  for delete using (public.is_own_therapy_session(session_id));

drop policy "assigned therapist manages goal progress" on public.session_goal_progress;
create policy "assigned therapist views goal progress" on public.session_goal_progress
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_goal_progress.session_id and public.is_assigned_therapist(ts.child_id))
  );
create policy "therapist manages own goal progress" on public.session_goal_progress
  for insert with check (public.is_own_therapy_session(session_id));
create policy "therapist updates own goal progress" on public.session_goal_progress
  for update using (public.is_own_therapy_session(session_id));
create policy "therapist deletes own goal progress" on public.session_goal_progress
  for delete using (public.is_own_therapy_session(session_id));

drop policy "assigned therapist manages reinforcers" on public.session_reinforcers;
create policy "assigned therapist views reinforcers" on public.session_reinforcers
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_reinforcers.session_id and public.is_assigned_therapist(ts.child_id))
  );
create policy "therapist manages own reinforcers" on public.session_reinforcers
  for insert with check (public.is_own_therapy_session(session_id));
create policy "therapist updates own reinforcers" on public.session_reinforcers
  for update using (public.is_own_therapy_session(session_id));
create policy "therapist deletes own reinforcers" on public.session_reinforcers
  for delete using (public.is_own_therapy_session(session_id));

-- ---------------------------------------------------------------------------
-- reports -- same split; generateReport/saveReport/publishReport in
-- src/lib/reports/actions.ts already independently re-check ownership
-- app-side, this is the matching RLS-level boundary.
-- ---------------------------------------------------------------------------

drop policy "assigned therapist manages reports" on public.reports;
create policy "assigned therapist views reports" on public.reports
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = reports.session_id and public.is_assigned_therapist(ts.child_id))
  );
create policy "therapist manages own reports" on public.reports
  for insert with check (public.is_own_therapy_session(session_id));
create policy "therapist updates own reports" on public.reports
  for update using (public.is_own_therapy_session(session_id));
create policy "therapist deletes own reports" on public.reports
  for delete using (public.is_own_therapy_session(session_id));
