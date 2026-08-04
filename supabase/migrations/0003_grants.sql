-- Fixes: RLS policies only *restrict* rows for a role that already has a
-- base table privilege -- they don't grant access by themselves. Tables
-- created via raw SQL (rather than the Studio table editor) don't get
-- Supabase's usual default grants automatically, so anon/authenticated had
-- zero access to anything until now.

grant usage on schema public to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant usage on sequences to anon, authenticated;

-- Broad grants for every table EXCEPT verification_requests, which needs
-- column-level handling below to keep reviewer_notes truly locked down.
-- (A blanket table-level GRANT SELECT covers every column and would
-- silently undo the column-level revoke from 0002 -- Postgres REVOKE can't
-- override a broader GRANT that still exists, it only removes a grant that
-- was made at that same level.)

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'verification_requests'
  loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- verification_requests: authenticated gets every column except
-- reviewer_notes; anon gets nothing (there's no anon-facing use case here
-- anyway). Admin server code reads reviewer_notes via the service-role
-- client, which bypasses grants and RLS entirely.
grant select (
  id, therapist_id, admin_id, status, verification_method,
  parent_facing_reason, submitted_at, reviewed_at
) on public.verification_requests to authenticated;
grant insert, update, delete on public.verification_requests to authenticated;
