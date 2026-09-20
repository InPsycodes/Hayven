-- Lets a therapist see WHO else is actively assigned to a shared child --
-- the roster itself, not just the clinical data those other therapists
-- write. Migrations 0011/0022 already let any assigned therapist read
-- goals/therapy_sessions/reports etc. for the whole care team via
-- is_assigned_therapist(child_id); therapist_child_assignments itself never
-- got the equivalent read-widening, so a co-assigned therapist could see a
-- second therapist's goals and session notes but had no way to see that a
-- second therapist existed. Mirrors 0022's pattern exactly. Write access is
-- unchanged: parent still manages assignments for their own child,
-- therapists still only self-assign from a real confirmed/completed
-- booking, admins still manage all.

create policy "assigned therapist views care team" on public.therapist_child_assignments
  for select using (public.is_assigned_therapist(child_id));
