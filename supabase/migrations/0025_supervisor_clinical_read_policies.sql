-- Care team model, part 2: read-only visibility into a supervised
-- therapist's clinical work, for coordination/oversight. These policies are
-- purely additive (Postgres OR's multiple policies for the same command on
-- the same table together) -- they do not touch or narrow any existing
-- policy from 0011/0022.
--
-- reports gets a row-level policy only. therapist_body/input_snapshot are
-- column-revoked from `authenticated` entirely (0017) because RLS can't
-- restrict columns -- the actual supervisor report-read path goes through
-- a service-role helper instead (src/lib/reports/queries.ts), same as the
-- therapist's own read path already does. This policy just lets a
-- supervisor confirm a report row exists.

create function public.is_supervised_child(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_child_assignments tca
    join public.supervisor_assignments sa on sa.therapist_id = tca.therapist_id
    where tca.child_id = p_child_id
      and tca.status = 'active'
      and sa.supervisor_id = auth.uid()
      and sa.status = 'active'
  );
$$;
grant execute on function public.is_supervised_child(uuid) to authenticated, service_role;

create policy "supervisor views supervised children" on public.children
  for select using (public.is_supervised_child(children.id));

create policy "supervisor views goals" on public.goals
  for select using (public.is_supervised_child(child_id));
create policy "supervisor views target behaviours" on public.target_behaviours
  for select using (public.is_supervised_child(child_id));
create policy "supervisor views skills" on public.skills
  for select using (public.is_supervised_child(child_id));
create policy "supervisor views therapy sessions" on public.therapy_sessions
  for select using (public.is_supervised_child(child_id));

create policy "supervisor views behaviour entries" on public.session_behaviour_entries
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_behaviour_entries.session_id and public.is_supervised_child(ts.child_id))
  );
create policy "supervisor views skill entries" on public.session_skill_entries
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_skill_entries.session_id and public.is_supervised_child(ts.child_id))
  );
create policy "supervisor views goal progress" on public.session_goal_progress
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_goal_progress.session_id and public.is_supervised_child(ts.child_id))
  );
create policy "supervisor views reinforcers" on public.session_reinforcers
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = session_reinforcers.session_id and public.is_supervised_child(ts.child_id))
  );
create policy "supervisor views reports" on public.reports
  for select using (
    exists (select 1 from public.therapy_sessions ts where ts.id = reports.session_id and public.is_supervised_child(ts.child_id))
  );
