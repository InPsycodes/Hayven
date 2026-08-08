-- Security fix: "therapist updates own bookings" (0002) has no WITH CHECK,
-- so Postgres reuses its USING clause (therapist_id ownership only) against
-- the new row -- a therapist could UPDATE any booking of theirs to point
-- child_id at an unrelated child, then use the existing, legitimate
-- "therapist self-assigns from a booking" policy (0011) to become the
-- assigned therapist for a child they have no real relationship with,
-- unlocking full read/write on that child's goals, sessions, and reports.
--
-- Same situation 0018 already found and fixed for the parent-side update
-- policy: no legitimate app code path ever uses this policy either. Every
-- real booking write (payment confirmation, marking past sessions
-- completed) goes through the service-role client in
-- src/lib/booking/actions.ts and src/lib/booking/queries.ts, never a
-- therapist's own client. Dropping it removes an unused, unsafe surface
-- instead of trying to patch it.

drop policy "therapist updates own bookings" on public.bookings;
