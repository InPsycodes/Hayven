-- Parent-raised disputes about a session that already happened (or didn't).
-- Defaults, adjustable later:
--   - only the parent opens one, on their own booking, within 7 days of the
--     session (the 7-day cutoff is enforced in the action, not here)
--   - one open dispute per booking at a time
--   - an admin resolves it: full refund / partial refund / no action, with
--     a note shown back to the parent
--   - while a dispute is open, that session's therapist payout is held
--     (payout_hold; the payout flow, when it lands, checks this)

create type dispute_status as enum ('open', 'resolved');
create type dispute_resolution as enum ('full_refund', 'partial_refund', 'no_action');

create table public.booking_disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  parent_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status dispute_status not null default 'open',
  resolution dispute_resolution,
  resolution_note text,
  refund_amount integer,
  admin_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index booking_disputes_one_open_per_booking
  on public.booking_disputes (booking_id) where status = 'open';
create index on public.booking_disputes (status, created_at);

alter table public.booking_disputes enable row level security;

create policy "parent views own disputes" on public.booking_disputes
  for select using (parent_id = auth.uid());

-- Same booking-ownership + fresh-fields discipline as support_requests
-- (0048): pin every admin-owned column to its blank value at insert.
create policy "parent opens a dispute on own past booking" on public.booking_disputes
  for insert with check (
    parent_id = auth.uid()
    and status = 'open'
    and resolution is null
    and resolution_note is null
    and refund_amount is null
    and admin_id is null
    and resolved_at is null
    and exists (
      select 1 from public.bookings b
      where b.id = booking_disputes.booking_id
        and b.parent_id = auth.uid()
        and b.status in ('completed', 'no_show', 'cancelled')
    )
  );

create policy "admins manage disputes" on public.booking_disputes
  for all using (public.current_user_role() = 'admin');

grant select, insert on public.booking_disputes to authenticated;
grant all privileges on public.booking_disputes to service_role;

alter table public.bookings add column payout_hold boolean not null default false;
