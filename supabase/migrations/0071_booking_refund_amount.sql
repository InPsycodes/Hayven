-- The naira amount the parent is owed back when a booking is cancelled,
-- computed from the cancellation policy (src/lib/booking/refund-policy.ts)
-- at cancel time. This is what the admin refund queue works from, and what
-- the future Paystack-refund automation will refund.
--
--   null -> not a paid cancellation, or cancelled before this column
--           existed (admin handles those at the full charged amount).
--   0    -> computed, nothing owed (no-show, or a cancel after start).
--   > 0  -> refund owed.
--
-- No RLS change: cancellation still goes through the service-role client
-- with an app-level ownership check (bookings' UPDATE policy is admin-only,
-- 0018/0030).

alter table public.bookings add column refund_amount integer;
