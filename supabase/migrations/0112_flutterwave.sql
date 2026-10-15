-- Switch from Paystack to Flutterwave (2026-10-15).
--
-- Paystack only ever ran in test mode, so no real payment depends on it.
-- This renames the Paystack-specific columns to neutral names and adds
-- what Flutterwave needs:
--
-- 1. payments: Flutterwave refunds by its own numeric transaction id, not
--    by our reference, so each payment stores it (gateway_transaction_id),
--    plus the id of any refund issued (refund_gateway_id) so a refund still
--    "processing" can be checked later. `gateway` records which provider
--    took the payment; the old test rows are marked 'paystack'.
--
-- 2. Webhook de-duplication: Paystack signed every delivery differently, so
--    the signature was the idempotency key. Flutterwave sends the same
--    secret hash on every delivery, so the key becomes the event itself
--    (event type + Flutterwave id + status), built by the webhook route.
--
-- 3. Payouts: Flutterwave transfers straight to an account number, so the
--    Paystack "transfer recipient" codes are no longer used and are dropped
--    (dropping a column also drops its column-level grants from 0084/0085).

-- 1. payments
alter table public.payments
  add column if not exists gateway text not null default 'flutterwave',
  add column if not exists gateway_transaction_id text,
  add column if not exists refund_gateway_id text;

update public.payments set gateway = 'paystack' where gateway_transaction_id is null;

create index if not exists payments_gateway_transaction_id on public.payments (gateway_transaction_id);

-- 2. webhook de-duplication
alter table public.paystack_webhook_events rename to payment_webhook_events;
alter table public.payment_webhook_events rename column signature to event_key;
alter index if exists public.paystack_webhook_events_received_idx rename to payment_webhook_events_received_idx;

-- 3. payouts
alter table public.payouts rename column paystack_reference to transfer_reference;
alter table public.payouts rename column paystack_transfer_code to transfer_id;

alter table public.therapist_profiles drop column if exists paystack_recipient_code;
alter table public.clinics drop column if exists paystack_recipient_code;
