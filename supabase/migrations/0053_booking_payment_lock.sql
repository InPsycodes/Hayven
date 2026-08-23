-- Prevents two concurrent Paystack transactions being initiated for the same
-- booking (double-click, browser refresh + retry, two open tabs). No RLS
-- policy needed -- this column is only ever written by initiatePaystackPayment
-- via the service-role client, same as the rest of the payment-init flow.
alter table public.bookings add column payment_initiated_at timestamptz;
