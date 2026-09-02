-- The therapist earnings ledger. One row per payout-eligible amount:
--   - `session`: a completed session. gross = what the parent paid.
--   - `retained_cancellation`: the money a parent forfeited on a late
--     cancel or no-show (after the Paystack fee). gross = that retained sum.
-- commission is Hayven's 20%; net is the therapist's take.
--
-- status: pending -> payable_at passes -> a payout run pays it (`paid`).
--   `held` while the session is disputed; `reversed` if a dispute ends in
--   a refund.
--
-- Rows are inserted by server code (cron completing sessions, the cancel /
-- no-show actions), never by a therapist -- so no insert/update policy for
-- `authenticated`, only a read policy for the owner. Same shape as payments.

create type earning_status as enum ('pending', 'held', 'paid', 'reversed');
create type earning_source as enum ('session', 'retained_cancellation');

create table public.therapist_earnings (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  source earning_source not null,
  gross_amount integer not null,
  commission_amount integer not null,
  net_amount integer not null,
  status earning_status not null default 'pending',
  payable_at timestamptz not null,
  payout_id uuid,
  created_at timestamptz not null default now(),
  unique (booking_id, source)
);
create index therapist_earnings_therapist_status_idx
  on public.therapist_earnings (therapist_id, status);
create index therapist_earnings_payout_idx on public.therapist_earnings (payout_id);

alter table public.therapist_earnings enable row level security;

create policy "therapist views own earnings" on public.therapist_earnings
  for select using (
    therapist_id in (select id from public.therapist_profiles where user_id = auth.uid())
  );
create policy "admins view all earnings" on public.therapist_earnings
  for all using (public.current_user_role() = 'admin');

grant select on public.therapist_earnings to authenticated;
grant all privileges on public.therapist_earnings to service_role;
