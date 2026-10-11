-- Clinics and commission rates (pricing plan step 1, 2026-10-11).
--
-- Until now Hayven took a flat 20% of every session (COMMISSION_RATE in
-- src/lib/payouts/commission.ts). Clinics joining Hayven get their own
-- terms: a free pilot (a rate, usually 0%, until a date), then an agreed
-- rate. A single therapist can also have their own rate.
--
-- The rate is worked out from the session's date when its earning is
-- recorded, and stored on that earning, so changing a clinic's terms
-- later never rewrites what was already earned.
--
-- A clinic's therapists are paid into the clinic's bank account (clinics
-- usually pay their own staff), so a clinic therapist no longer needs a
-- personal bank account to appear in search.
--
-- Access: clinics holds bank details and commercial terms, so it follows
-- the server-only pattern (0104, 0110): RLS on, no policies, no grants to
-- anon/authenticated. Admin pages manage it through the service-role client.

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  -- After the pilot (or with no pilot), Hayven's share as a fraction.
  commission_rate numeric(5, 4) not null default 0.10 check (commission_rate >= 0 and commission_rate <= 0.5),
  -- During the pilot: sessions on or before pilot_ends_on use pilot_rate.
  pilot_rate numeric(5, 4) not null default 0 check (pilot_rate >= 0 and pilot_rate <= 0.5),
  pilot_ends_on date,
  bank_code text,
  bank_account_number text,
  bank_account_name text,
  paystack_recipient_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clinics enable row level security;
revoke all on public.clinics from anon, authenticated;
grant all privileges on public.clinics to service_role;

-- Not added to the therapist-facing column grants, so a therapist can't
-- change their own clinic or rate; only the admin pages (service role) can.
alter table public.therapist_profiles
  add column if not exists clinic_id uuid references public.clinics(id) on delete set null,
  add column if not exists commission_rate_override numeric(5, 4)
    check (commission_rate_override is null or (commission_rate_override >= 0 and commission_rate_override <= 0.5));

create index if not exists therapist_profiles_clinic on public.therapist_profiles (clinic_id);

-- The rate actually applied. Null on earnings recorded before this
-- migration, which were all at the flat 20%.
alter table public.therapist_earnings
  add column if not exists commission_rate numeric(5, 4);

-- Somewhere to pay the therapist: their own account, or their clinic's.
create or replace function public.has_payout_account(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_profiles tp
    left join public.clinics c on c.id = tp.clinic_id
    where tp.id = p_therapist_id
      and (tp.bank_account_number is not null or c.bank_account_number is not null)
  );
$$;
grant execute on function public.has_payout_account(uuid) to anon, authenticated, service_role;

-- Same columns and order as 0106; only the bank condition changes.
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
  and public.has_payout_account(tp.id)
  and u.status = 'active'
  and exists (select 1 from public.availability_slots av where av.therapist_id = tp.id)
  and public.has_current_insurance(tp.id)
group by tp.id, u.full_name;

create or replace function public.is_publicly_bookable_therapist(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_profiles tp
    join public.users u on u.id = tp.user_id
    where tp.id = p_therapist_id
      and tp.verification_status = 'verified'
      and public.has_payout_account(tp.id)
      and u.status = 'active'
      and public.has_current_insurance(tp.id)
  );
$$;
