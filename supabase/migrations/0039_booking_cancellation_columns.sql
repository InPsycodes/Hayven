-- Additive columns for the new parent-initiated cancellation flow. No RLS
-- changes -- bookings' UPDATE policy stays admin-only (recently hardened in
-- 0018/0030 after real hijack bugs), so cancellation still goes through the
-- service-role client with an app-level ownership check, same as every
-- other booking write in src/lib/booking/actions.ts.

alter table public.bookings
  add column cancelled_at timestamptz,
  add column cancellation_reason text;
