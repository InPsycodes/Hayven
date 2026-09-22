-- Fixes a real bug in 0093's own policy, found by testing it (not a
-- theoretical review): "assigned therapist manages orphaned goals" checks
-- the goal's author's account status via a plain inline EXISTS against
-- therapist_profiles/users. Unlike is_assigned_therapist() (SECURITY
-- DEFINER, so it bypasses RLS on the tables it internally queries), a plain
-- inline EXISTS runs under the CALLING user's own privileges -- so it's
-- itself subject to users'/therapist_profiles' RLS. A currently-assigned
-- therapist has no RLS-granted visibility into an unrelated, departed
-- colleague's users row, so the EXISTS silently found nothing FROM THEIR
-- PERSPECTIVE even though the row plainly exists -- the exact "policy
-- references another table's RLS-protected data without a security-definer
-- indirection" class of bug 0033 (supervisor_assignments) already hit once
-- in this schema. Confirmed live: is_assigned_therapist(child_id) alone
-- returned true for the currently-assigned therapist, the author's status
-- checked out 'suspended' via the admin client, and the policy's SQL text
-- was correct -- but the UPDATE still silently affected 0 rows until this
-- fix.

create function public.is_goal_author_inactive(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_profiles tp
    join public.users u on u.id = tp.user_id
    where tp.id = p_therapist_id and u.status = 'suspended'
  );
$$;
grant execute on function public.is_goal_author_inactive(uuid) to authenticated, service_role;

drop policy "assigned therapist manages orphaned goals" on public.goals;
create policy "assigned therapist manages orphaned goals" on public.goals
  for update using (
    public.is_assigned_therapist(child_id)
    and public.is_goal_author_inactive(goals.therapist_id)
  );
