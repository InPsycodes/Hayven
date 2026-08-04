-- Public discovery needs a therapist's display name, but public.users' RLS
-- intentionally only allows reading your own row (or admin). Rather than
-- loosening users' RLS/grants -- which would also expose email/phone to
-- anyone browsing -- this view runs with the definer's privileges and
-- exposes only the safe, already-public fields for verified therapists.

create view public.therapist_public_profiles as
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
  ) as specialty_names
from public.therapist_profiles tp
join public.users u on u.id = tp.user_id
left join public.therapist_specialties ts on ts.therapist_id = tp.id
left join public.specialties s on s.id = ts.specialty_id
where tp.verification_status = 'verified'
group by tp.id, u.full_name;

grant select on public.therapist_public_profiles to anon, authenticated;
