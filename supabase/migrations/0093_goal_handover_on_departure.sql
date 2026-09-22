-- E12 from the external PRD review. goals' UPDATE policy (0031) requires
-- BOTH authorship (goals.therapist_id's user = auth.uid()) and current
-- assignment (is_assigned_therapist(child_id)) -- so a goal only its
-- original author could ever manage becomes permanently frozen once that
-- author's account is suspended or offboarded: no one else, not a new
-- treating therapist, not a supervisor, not even another admin through the
-- app, can ever toggle its status again. This adds a second, additive path:
-- any therapist CURRENTLY assigned to the child can manage a goal whose
-- original author's account is no longer active -- without ever touching
-- goals.therapist_id, so the goal still shows who actually wrote it.
--
-- Deliberately keyed on the author's account status generally
-- (users.status = 'suspended'), not a permanent-departure-only flag --
-- there isn't one; suspension (temporary, e.g. pending a safeguarding
-- investigation) and offboarding (permanent) both set the same status
-- column today, see offboardTherapist (src/lib/admin/actions.ts). Letting
-- a child's other currently-assigned therapist keep a goal moving during
-- a temporary suspension is a safe continuity measure, not a gap: they
-- already have full read access to it via the shared "assigned therapist
-- views goals" policy, this only extends them write access for status
-- changes on this one goal, and only for exactly as long as the original
-- author can't act themselves.
--
-- UPDATE only, not DELETE -- no app action ever deletes a goal (only
-- updateGoalStatus, src/lib/programme/actions.ts), so there's nothing real
-- to extend there, and deletion is a more consequential action this pass
-- deliberately leaves untouched.

create policy "assigned therapist manages orphaned goals" on public.goals
  for update using (
    public.is_assigned_therapist(child_id)
    and exists (
      select 1
      from public.therapist_profiles tp
      join public.users u on u.id = tp.user_id
      where tp.id = goals.therapist_id and u.status = 'suspended'
    )
  );

-- "Preserve original creator permanently for audit/history" (the explicit
-- requirement this migration exists to satisfy) needs more than the policy
-- above provides: an UPDATE policy with no WITH CHECK reuses its own USING
-- as the check, evaluated against the NEW row -- which doesn't stop the
-- update from also changing therapist_id/child_id in the same statement.
-- Neither column had an immutability guarantee before this migration (no
-- trigger, no WITH CHECK anywhere in 0011/0022/0031's goals policies) --
-- narrower before now, since only the original author could attempt it and
-- only onto a child they were also assigned to (0031's own fix). This
-- policy widens who has UPDATE reach on someone else's goal, which widens
-- that same exposure unless closed here -- same shape as 0037's
-- therapist_child_assignments fix, applied to goals for the first time.
create function public.prevent_goal_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.child_id is distinct from old.child_id or new.therapist_id is distinct from old.therapist_id then
    raise exception 'child_id and therapist_id cannot be changed on an existing goal.';
  end if;
  return new;
end;
$$;

create trigger prevent_goal_reassignment_trigger
  before update on public.goals
  for each row execute procedure public.prevent_goal_reassignment();
