-- Therapist bank details (for payouts) + the payouts table.
--
-- Bank fields are written only by the therapist's own updateBankDetails
-- action, which resolves the account against Paystack first -- so RLS just
-- needs the existing "therapist manages own profile" policy (0002) to keep
-- covering these columns, which a plain column add does.
--
-- A verified therapist without a bank account is hidden from public
-- discovery (the view below) -- they can't be booked until they can be paid.

alter table public.therapist_profiles
  add column bank_code text,
  add column bank_account_number text,
  add column bank_account_name text,
  add column paystack_recipient_code text;

create or replace view public.therapist_public_profiles as
select
  tp.id,
  tp.bio,
  tp.location,
  tp.session_types,
  tp.price_per_session,
  tp.years_practicing,
  tp.verified_badge_label,
  u.full_name as display_name,
  coalesce(
    array_agg(s.name) filter (where s.name is not null),
    '{}'
  ) as specialty_names,
  tp.photo_url
from public.therapist_profiles tp
join public.users u on u.id = tp.user_id
left join public.therapist_specialties ts on ts.therapist_id = tp.id
left join public.specialties s on s.id = ts.specialty_id
where tp.verification_status = 'verified'
  and tp.bank_account_number is not null
group by tp.id, u.full_name;

grant select on public.therapist_public_profiles to anon, authenticated;

-- payouts -------------------------------------------------------------------

create type payout_status as enum ('pending', 'processing', 'paid', 'failed');

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapist_profiles(id),
  amount integer not null,
  earning_count integer not null default 0,
  status payout_status not null default 'pending',
  paystack_transfer_code text,
  paystack_reference text unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payouts_therapist_idx on public.payouts (therapist_id, created_at desc);
create index payouts_status_idx on public.payouts (status);

alter table public.payouts enable row level security;

create policy "therapist views own payouts" on public.payouts
  for select using (
    therapist_id in (select id from public.therapist_profiles where user_id = auth.uid())
  );
create policy "admins manage payouts" on public.payouts
  for all using (public.current_user_role() = 'admin');

grant select on public.payouts to authenticated;
grant all privileges on public.payouts to service_role;

alter table public.therapist_earnings
  add constraint therapist_earnings_payout_fk
  foreign key (payout_id) references public.payouts(id) on delete set null;
