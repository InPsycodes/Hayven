-- 0043 added therapist_profiles.report_tone but missed that this table uses
-- column-scoped insert/update grants (0021), not a blanket table grant --
-- so the new column was invisible to `authenticated` writes. Confirmed live:
-- a real therapist's profile save failed with "permission denied for table
-- therapist_profiles" as soon as report_tone was included in the update.
-- Same root cause class as 0044 (0003/0012/0021's own documented gotcha).

revoke insert, update on public.therapist_profiles from authenticated;

grant insert (
  user_id, bio, location, session_types, price_per_session,
  years_practicing, photo_url, report_tone
) on public.therapist_profiles to authenticated;

grant update (
  user_id, bio, location, session_types, price_per_session,
  years_practicing, photo_url, updated_at, report_tone
) on public.therapist_profiles to authenticated;
