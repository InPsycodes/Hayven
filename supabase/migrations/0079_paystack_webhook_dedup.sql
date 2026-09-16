-- Full-platform diagnostic, 2026-09-16. L-7 (production audit
-- 2026-09-03): no Paystack webhook had replay protection -- a captured
-- valid (body, x-paystack-signature) pair could be replayed indefinitely,
-- and even an ordinary Paystack retry re-ran finalizeRefund (a duplicate
-- "Refund complete" notification). The signature is an HMAC-SHA512 over the
-- exact raw body, so an identical delivery always produces the exact same
-- signature -- the unique constraint below is what makes the dedup in
-- src/app/api/webhooks/paystack/route.ts atomic under concurrent delivery,
-- not just the app-level check.

create table public.paystack_webhook_events (
  id uuid primary key default gen_random_uuid(),
  signature text not null unique,
  event_type text not null,
  received_at timestamptz not null default now()
);
create index paystack_webhook_events_received_idx on public.paystack_webhook_events (received_at desc);

alter table public.paystack_webhook_events enable row level security;
-- Service-role only -- this is bookkeeping for the webhook route, never
-- read or written by a user session.
grant all privileges on public.paystack_webhook_events to service_role;
