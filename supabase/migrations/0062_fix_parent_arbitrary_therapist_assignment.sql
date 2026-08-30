-- Security fix: "parent manages assignments for own children" (0011) is a
-- single `for all using (is_parent_of_child(child_id))` policy. Postgres
-- applies USING as WITH CHECK too when a `for all` policy declares no
-- explicit WITH CHECK, so the only constraint on INSERT is that the
-- child belongs to the calling parent -- therapist_id is never validated.
-- A parent's own session token can POST directly to PostgREST's
-- /therapist_child_assignments (the table already carries a blanket
-- INSERT grant from 0012) with {child_id: <own child>, therapist_id:
-- <any verified therapist's id>}, granting that therapist full clinical
-- read/write on the child -- session notes, ABC observations, diagnoses,
-- reports -- with no booking, payment, or vetting. Same bug class already
-- found and fixed on the supervisor side in 0032 ("a real safeguarding
-- gap, not just a data-model looseness" -- same reasoning applies here);
-- this parent-side twin was missed at the time.
--
-- No app code exercises this insert path today -- src/ has no UI that
-- lets a parent directly create an assignment -- so this closes an
-- API-only attack surface, not a working feature.
--
-- Fix: require the same booking-established relationship this table
-- already requires from the therapist side ("therapist self-assigns from
-- a booking", 0011) -- a parent may only formalise an assignment to a
-- therapist their child already has a confirmed/completed booking with.
-- The same requirement is repeated on UPDATE's WITH CHECK (see comment
-- below) so the gap can't reopen via re-pointing an existing row instead
-- of inserting a new one. DELETE is untouched: ending an existing
-- assignment for your own child was never the risky operation here.

drop policy "parent manages assignments for own children" on public.therapist_child_assignments;

create policy "parent assigns therapist from a booking" on public.therapist_child_assignments
  for insert with check (
    public.is_parent_of_child(child_id)
    and exists (
      select 1 from public.bookings b
      where b.child_id = therapist_child_assignments.child_id
        and b.therapist_id = therapist_child_assignments.therapist_id
        and b.status in ('confirmed', 'completed')
    )
  );

-- WITH CHECK repeats the booking requirement, not just is_parent_of_child:
-- otherwise a parent could re-point an existing row's therapist_id to an
-- unbooked therapist via UPDATE, recreating the exact INSERT gap above
-- through a different verb.
create policy "parent updates own child assignments" on public.therapist_child_assignments
  for update using (public.is_parent_of_child(child_id))
  with check (
    public.is_parent_of_child(child_id)
    and exists (
      select 1 from public.bookings b
      where b.child_id = therapist_child_assignments.child_id
        and b.therapist_id = therapist_child_assignments.therapist_id
        and b.status in ('confirmed', 'completed')
    )
  );

create policy "parent deletes own child assignments" on public.therapist_child_assignments
  for delete using (public.is_parent_of_child(child_id));
