-- Bugfix: the original "assigned therapists can view children" policy on
-- public.children (0002_rls.sql) only recognises access via a real booking.
-- therapist_child_assignments (0010/0011) formalised a second, booking-free
-- way to be "assigned" to a child, but children's own RLS was never taught
-- about it -- so a therapist with only an assignment (no booking) can see
-- the assignment row itself but not the joined child, and the caseload page
-- silently renders empty.
--
-- Postgres RLS policies for the same command on the same table are OR'd
-- together, so this is purely additive: it does not change or replace the
-- existing booking-based policy, it just adds a second legitimate path to
-- the same permission.

create policy "assigned therapists can view children via assignment" on public.children
  for select using (public.is_assigned_therapist(children.id));
