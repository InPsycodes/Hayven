-- Tracks an automated refund's progress, separate from payments.status
-- (which flips to 'refunded' only once the money is confirmed back).
--   null          -> no automated refund in flight (may still be owed;
--                    that's derived from payment.status + refund_amount)
--   'processing'  -> Paystack /refund accepted, awaiting the refund.* webhook
--   'processed'   -> confirmed by webhook
--   'manual'      -> an admin refunded it outside the app and marked it done
--
-- No RLS change: refunds are driven by admin actions + the Paystack webhook,
-- both service-role.

alter table public.bookings add column refund_status text;
