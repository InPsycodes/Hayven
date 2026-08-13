-- 0043 added RLS policies for report_phrase_variants but missed the
-- underlying Postgres GRANT to `authenticated` -- this project's Supabase
-- setup does not auto-grant table privileges the way its defaults might
-- suggest (see 0003_grants.sql), so without this, PostgREST rejects every
-- request with "permission denied" before RLS policies are even evaluated,
-- regardless of what the policies say. Confirmed via a live RLS-scoped
-- test: an authenticated therapist's select was blocked outright instead
-- of the intended "allowed, filtered by policy" behaviour.

grant select, insert, delete on public.report_phrase_variants to authenticated;
