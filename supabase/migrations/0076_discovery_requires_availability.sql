-- Third onboarding gate: a therapist only appears in public discovery once
-- they've added availability (0074 already added the verification + bank
-- gates). Keeps a set-up-but-empty profile from showing as bookable.

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
  and exists (select 1 from public.availability_slots av where av.therapist_id = tp.id)
group by tp.id, u.full_name;

grant select on public.therapist_public_profiles to anon, authenticated;
