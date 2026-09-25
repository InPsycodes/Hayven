-- Moves refund progress tracking from the booking to the payment.
--
-- 0075 put refund_status on bookings, one per booking. But a booking can
-- carry more than one refundable charge: finalizeBookingPayment records a
-- second real Paystack charge on an already-confirmed booking as a
-- duplicate, owed back in full (BOOK-01). Refunding that duplicate wrote
-- the booking's refund_status ('processing', then 'processed'). If the
-- parent later cancelled the booking, processRefund saw the booking as
-- "already in progress" and refused the real cancellation refund. It
-- worked the other way round too: once the booking's own refund was
-- processed, its duplicate charge could no longer be refunded through the
-- app.
--
-- Same values and meaning as 0075, tracked per charge:
--   null          -> no automated refund in flight
--   'processing'  -> Paystack /refund accepted, awaiting the refund.* webhook
--   'processed'   -> confirmed by webhook
--   'manual'      -> an admin refunded it outside the app and marked it done
--
-- bookings.refund_status is left in place (no longer written) so a deploy
-- still running the old code doesn't break mid-rollout. It can be dropped
-- in a later migration.
--
-- No RLS change: refunds are driven by admin actions and the Paystack
-- webhook, both service-role.

alter table public.payments add column refund_status text;

-- Backfill: the booking-level status always described the booking's own
-- charge, which is its earliest session_commission payment.
update public.payments p
set refund_status = b.refund_status
from public.bookings b
where p.booking_id = b.id
  and b.refund_status is not null
  and p.id = (
    select p2.id
    from public.payments p2
    where p2.booking_id = b.id
      and p2.type = 'session_commission'
    order by p2.created_at, p2.id
    limit 1
  );
