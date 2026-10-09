-- Therapist Agreement §7 (decided 2026-10-09): a therapist must hold
-- current professional indemnity insurance to practise on Hayven. 0105
-- added the insurance credential + cover end date; this makes it a hard
-- gate alongside the existing ones (verified, bank account, active
-- account, availability -- 0074/0076/0092): no current cover, no search
-- listing, no publicly visible slots, no new bookings.
--
-- "Current" = an insurance credential whose cover ends after today. A
-- therapist whose cover lapses drops out of search automatically the day
-- it ends, and comes back as soon as they upload a renewed certificate.
-- Existing bookings are unaffected.

create or replace function public.has_current_insurance(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.credentials c
    where c.therapist_id = p_therapist_id
      and c.document_type = 'insurance'
      and c.expires_on > current_date
  );
$$;
grant execute on function public.has_current_insurance(uuid) to anon, authenticated, service_role;

-- Same column list and order as 0092 (create or replace view can't
-- reorder); only the WHERE clause gains the insurance condition.
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
  and u.status = 'active'
  and exists (select 1 from public.availability_slots av where av.therapist_id = tp.id)
  and public.has_current_insurance(tp.id)
group by tp.id, u.full_name;

-- The availability_slots public-read gate (0101) follows the same rule.
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
      and tp.bank_account_number is not null
      and u.status = 'active'
      and public.has_current_insurance(tp.id)
  );
$$;
