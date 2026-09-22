-- E12 from the external PRD review, first finding: therapist_public_profiles
-- (0009, refined by 0074/0076) never checked users.status -- a suspended
-- account (setUserAccountStatus, src/lib/admin/actions.ts) stayed fully
-- bookable. createPendingBooking (src/lib/booking/actions.ts) never checked
-- it either. Not a policy question like the rest of E12 -- there's no
-- legitimate reading under which a suspended-or-departed therapist should
-- still be discoverable or newly bookable, so this is fixed independent of
-- how the rest of the departure workflow gets built.

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
group by tp.id, u.full_name;
