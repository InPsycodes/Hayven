-- Fixes a regression introduced by 0062: the original 0011 policy being
-- replaced there was `for all`, which implicitly covered SELECT too. 0062
-- split it into INSERT/UPDATE/DELETE and never added a replacement SELECT
-- policy, so parents lost read access to their own children's assignment
-- rows entirely.
--
-- This was caught by testing the fix live: an authenticated parent's
-- INSERT into therapist_child_assignments with a real confirmed booking
-- (the exact case 0062 was supposed to keep working) failed with "new row
-- violates row-level security policy". Root cause: Postgres enforces
-- SELECT-level row security on the row returned by INSERT ... RETURNING
-- (which is what supabase-js's .insert().select() compiles to) in
-- addition to the INSERT policy's WITH CHECK -- see the Row Security
-- Policies chapter of the Postgres docs, "INSERT/UPDATE ... RETURNING".
-- With no SELECT policy at all for parents, that RETURNING step had
-- nothing to permit it, so the whole statement was rejected even though
-- the INSERT's own WITH CHECK correctly passed.
--
-- No app code was broken by this in production -- nothing currently reads
-- this table as a parent -- but the gap was real and would have broken
-- the very insert path 0062 exists to allow, the moment anything called
-- it with .select() chained (as supabase-js callers routinely do).

create policy "parent views own child assignments" on public.therapist_child_assignments
  for select using (public.is_parent_of_child(child_id));
