-- The UI built during the frontend-mock phase displays a couple of fields
-- that aren't in the original build-plan schema (years practicing, a photo).
-- Adding them here rather than stripping them from already-built UI.

alter table public.therapist_profiles
  add column if not exists years_practicing integer,
  add column if not exists photo_url text;
