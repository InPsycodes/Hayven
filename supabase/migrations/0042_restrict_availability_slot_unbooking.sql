-- Security fix: "therapist manages own availability" (0002) is `for all
-- using (...)` with no WITH CHECK, which Postgres defaults to the same as
-- USING -- i.e. a therapist can set any column to any value on their own
-- slot rows, including is_booked. finalizeBookingPayment never re-validates
-- the slot's is_booked state when confirming payment, so a therapist could
-- manually flip is_booked back to false on a slot with an active
-- pending_payment or confirmed booking, letting a second parent book the
-- same slot; both bookings could then be confirmed independently.
--
-- This only affects direct table access under the therapist's own session
-- (e.g. the Supabase client hitting PostgREST directly) -- every app write
-- to is_booked=false (src/lib/booking/actions.ts, src/lib/therapist/queries.ts
-- releaseExpiredHolds) goes through the admin/service-role client, which
-- bypasses RLS entirely and is unaffected by this change.

alter policy "therapist manages own availability" on public.availability_slots
  with check (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = availability_slots.therapist_id and tp.user_id = auth.uid()
    )
    and (
      is_booked = true
      or not exists (
        select 1 from public.bookings b
        where b.availability_slot_id = availability_slots.id
          and b.status in ('pending_payment', 'confirmed')
      )
    )
  );
