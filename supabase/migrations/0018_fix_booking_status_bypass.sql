-- Security fix: "parent creates own bookings" only checked row ownership
-- (parent_id = auth.uid()), not the status being inserted, so a parent could
-- INSERT a booking with status: 'confirmed' directly, skipping payment.
-- "parent updates own bookings" had the same gap on UPDATE, and on top of
-- that, no legitimate app code path ever needs it -- every real booking
-- update (payment confirmation, marking past sessions completed) already
-- goes through the service-role client in src/lib/booking/actions.ts and
-- src/lib/booking/queries.ts, never the normal client. Dropping the update
-- policy removes an unused, unsafe surface instead of trying to patch it.

drop policy "parent updates own bookings" on public.bookings;

drop policy "parent creates own bookings" on public.bookings;
create policy "parent creates own bookings" on public.bookings
  for insert with check (parent_id = auth.uid() and status = 'pending_payment');
