-- Security fix: 0022 split the original single "for all using
-- (is_assigned_therapist(child_id))" policies (0011) on goals and
-- therapy_sessions into per-command policies, to support shared-read/
-- own-write across a care team. In doing so, the UPDATE/DELETE variants
-- ("therapist edits/deletes own goals", "...therapy sessions") kept
-- ownership (authored-by-me) but dropped the is_assigned_therapist(child_id)
-- re-check the original combined policy always enforced. Two consequences:
--
-- 1. Hijack: a therapist could UPDATE a goal/session they authored and
--    re-point its child_id at a child they've never been assigned to,
--    planting fabricated clinical data on that child's case.
-- 2. Stale access: a therapist REMOVED from a case (their
--    therapist_child_assignments row set to 'ended') keeps full write
--    access to every goal/session they ever authored on that case,
--    indefinitely, since ownership never expires the way an assignment
--    does.
--
-- The same gap exists, transitively, on session_behaviour_entries,
-- session_skill_entries, session_goal_progress, session_reinforcers, and
-- reports, because all five key their own INSERT/UPDATE/DELETE policies off
-- is_own_therapy_session(session_id), which -- like the goals/sessions
-- policies above -- only ever checked authorship, never current assignment.
-- Fixing is_own_therapy_session() itself closes all five at once, since it's
-- the single shared helper backing every one of them; no per-table policy
-- changes needed for that layer.

create or replace function public.is_own_therapy_session(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapy_sessions ts
    join public.therapist_profiles tp on tp.id = ts.therapist_id
    where ts.id = p_session_id
      and tp.user_id = auth.uid()
      and public.is_assigned_therapist(ts.child_id)
  );
$$;

drop policy "therapist edits own goals" on public.goals;
create policy "therapist edits own goals" on public.goals
  for update using (
    exists (select 1 from public.therapist_profiles tp where tp.id = goals.therapist_id and tp.user_id = auth.uid())
    and public.is_assigned_therapist(child_id)
  );
drop policy "therapist deletes own goals" on public.goals;
create policy "therapist deletes own goals" on public.goals
  for delete using (
    exists (select 1 from public.therapist_profiles tp where tp.id = goals.therapist_id and tp.user_id = auth.uid())
    and public.is_assigned_therapist(child_id)
  );

drop policy "therapist edits own therapy sessions" on public.therapy_sessions;
create policy "therapist edits own therapy sessions" on public.therapy_sessions
  for update using (
    exists (select 1 from public.therapist_profiles tp where tp.id = therapy_sessions.therapist_id and tp.user_id = auth.uid())
    and public.is_assigned_therapist(child_id)
  );
drop policy "therapist deletes own therapy sessions" on public.therapy_sessions;
create policy "therapist deletes own therapy sessions" on public.therapy_sessions
  for delete using (
    exists (select 1 from public.therapist_profiles tp where tp.id = therapy_sessions.therapist_id and tp.user_id = auth.uid())
    and public.is_assigned_therapist(child_id)
  );
