-- Security fix: "supervisor updates team assignments" (0032) checks only
-- is_supervisor_of_therapist(therapist_id) in both USING and WITH CHECK --
-- it never re-validates child_id. Any supervisor who legitimately has
-- update rights on ANY row for their team (which every real therapist
-- already has via booking self-assignment, per 0011) could run a raw
-- UPDATE changing that row's child_id to an arbitrary child, completely
-- bypassing the child_has_confirmed_booking() gate 0032/0034 built for
-- INSERT. This reopens the exact safeguarding gap 0032 set out to close,
-- just through UPDATE instead of INSERT.
--
-- RLS can't directly express "this column must equal what it was before"
-- without either a self-referencing subquery (the exact recursion trap
-- 0033 already hit once on this same table) or a BEFORE UPDATE trigger.
-- A trigger is the cleaner fix here: it sidesteps RLS rewriting entirely,
-- and closes the hole for every role with update rights on this table
-- (parent, admin, supervisor), not just supervisors -- confirmed via
-- src/lib/supervisor/actions.ts and src/lib/admin/actions.ts that no
-- legitimate app code ever changes child_id/therapist_id on an existing
-- assignment row; every real "reassignment" ends one row (status/ended_on
-- only) and creates a new one.

create function public.prevent_assignment_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.child_id is distinct from old.child_id or new.therapist_id is distinct from old.therapist_id then
    raise exception 'child_id and therapist_id cannot be changed on an existing assignment -- end it and create a new one instead';
  end if;
  return new;
end;
$$;

create trigger prevent_therapist_child_assignment_reassignment
  before update on public.therapist_child_assignments
  for each row execute procedure public.prevent_assignment_reassignment();
