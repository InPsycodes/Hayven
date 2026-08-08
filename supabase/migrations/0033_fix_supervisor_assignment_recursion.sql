-- Bug fix for 0032, caught by live testing: its INSERT policy's WITH CHECK
-- referenced public.therapist_child_assignments (the same table the policy
-- is on) via a raw inline `exists (select ... from
-- therapist_child_assignments existing ...)` subquery. Postgres re-evaluates
-- RLS policies for any query against a table, including a subquery inside
-- another policy on that same table -- so this threw "infinite recursion
-- detected in policy for relation therapist_child_assignments" on every
-- insert attempt, negative and positive alike. Every other cross-referencing
-- policy in this codebase (is_assigned_therapist, is_supervisor_of_therapist,
-- is_own_therapy_session, is_supervised_child) already avoids exactly this
-- by wrapping the check in a `security definer` function, which runs with
-- elevated privilege and so bypasses RLS on its own internal query, breaking
-- the recursion. This migration gives the 0032 check the same treatment.

create function public.child_has_active_assignment(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.therapist_child_assignments
    where child_id = p_child_id and status = 'active'
  );
$$;
grant execute on function public.child_has_active_assignment(uuid) to authenticated, service_role;

drop policy "supervisor assigns team therapist to existing client" on public.therapist_child_assignments;
create policy "supervisor assigns team therapist to existing client" on public.therapist_child_assignments
  for insert with check (
    public.is_supervisor_of_therapist(therapist_id)
    and public.child_has_active_assignment(child_id)
  );
