-- Full-platform diagnostic, 2026-09-16. L-10 (production audit
-- 2026-09-03): initiatePaystackPayment re-reads
-- therapist_profiles.price_per_session at pay time rather than a price
-- captured when the hold was created. If the therapist raises their price
-- between the parent holding a slot and paying (up to 15 minutes later),
-- the parent is silently charged the higher amount. Snapshot the price onto
-- the booking at creation; the app now charges that, not whatever the
-- therapist's price happens to be by the time payment starts.

alter table public.bookings add column price_naira integer;

comment on column public.bookings.price_naira is
  'Snapshot of therapist_profiles.price_per_session at the moment this booking hold was created. Nullable for rows created before this column existed; the app falls back to the live price for those.';
