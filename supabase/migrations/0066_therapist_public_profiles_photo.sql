-- Surface therapist_profiles.photo_url (added in 0007, uploaded at
-- onboarding since then) through the public discovery view so the search
-- results and profile page can show a real photo instead of just initials.
-- Appended as the last column so `create or replace view` accepts it.

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
group by tp.id, u.full_name;

grant select on public.therapist_public_profiles to anon, authenticated;
