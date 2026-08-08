-- Security fix: "supervisor manages team assignments" (0024) is a single
-- `for all` policy checking only is_supervisor_of_therapist(therapist_id) --
-- it never validates child_id at all. Confirmed directly exploitable through
-- the real UI: src/app/supervisor/assignments/page.tsx sources its child
-- picker from getAllChildrenForAdmin(), every child on the entire platform,
-- with no scoping to the supervisor's own team. Any supervisor with at least
-- one active therapist under them could grant that therapist -- and, via
-- is_supervised_child(), themselves -- full clinical read/write access to
-- any child in the system, with no booking, consent, or prior relationship
-- required. This is a children's therapy platform; that's a real safeguarding
-- gap, not just a data-model looseness.
--
-- Fix: split the single policy into its real INSERT/UPDATE/DELETE shapes.
-- INSERT now also requires the child already have an existing active
-- assignment to *some* therapist on the platform -- i.e. an established
-- Hayven client, not an arbitrary/unengaged child -- which is the same
-- boundary the rest of the supervisor surface already assumes (supervisors
-- coordinate care for children already in active treatment, they don't
-- originate brand-new clinical relationships; that stays an admin-only
-- action via assignTherapistToChild, a fully-trusted role by design).
-- UPDATE/DELETE are untouched in spirit -- ending your own team's existing
-- assignment was never the risky operation here.

drop policy "supervisor manages team assignments" on public.therapist_child_assignments;

create policy "supervisor assigns team therapist to existing client" on public.therapist_child_assignments
  for insert with check (
    public.is_supervisor_of_therapist(therapist_id)
    and exists (
      select 1 from public.therapist_child_assignments existing
      where existing.child_id = therapist_child_assignments.child_id
        and existing.status = 'active'
    )
  );

create policy "supervisor updates team assignments" on public.therapist_child_assignments
  for update using (public.is_supervisor_of_therapist(therapist_id))
  with check (public.is_supervisor_of_therapist(therapist_id));

create policy "supervisor deletes team assignments" on public.therapist_child_assignments
  for delete using (public.is_supervisor_of_therapist(therapist_id));
