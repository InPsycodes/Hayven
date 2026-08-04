-- Same root cause as 0003: tables created via raw SQL don't inherit
-- Supabase's usual default grants. service_role bypasses RLS by design (for
-- trusted server-only code), so unlike anon/authenticated it gets full,
-- unrestricted access to every table and column -- including
-- verification_requests.reviewer_notes, which is exactly the point of
-- having a service-role path for admin code.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
