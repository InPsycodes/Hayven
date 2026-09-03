-- ===========================================================================
-- Removes everything seed-therapists.sql created.
--
-- RUN THIS ONLY ON THE THROWAWAY / STAGING PROJECT (hayven_load_test).
-- Never run it against production.
--
-- Deleting the auth.users rows cascades through:
--   auth.users -> public.users -> therapist_profiles
--     -> therapist_specialties, availability_slots, credentials, bookings...
-- (all on delete cascade from 0001).
-- ===========================================================================

delete from auth.users
where email like 'loadtest+%@hayven.test';

-- Verify nothing synthetic is left:
select count(*) as remaining_loadtest_users
from auth.users
where email like 'loadtest+%@hayven.test';

select count(*) as verified_profiles_now
from public.therapist_profiles
where verification_status = 'verified';
