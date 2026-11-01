-- Audit 2026-10-29, production fingerprint (defence in depth). Production
-- was created when Supabase granted ALL on new tables to `anon` and
-- `authenticated`, so on top of what 0003 and 0113 grant, both roles still
-- hold TRUNCATE, REFERENCES and TRIGGER (anon on the 9 public tables,
-- authenticated on all 52). Staging never had them, and the app and every
-- test suite run without them.
--
-- None is reachable through the API today (PostgREST can't issue TRUNCATE
-- or DDL), but TRUNCATE ignores row-level security entirely: if a future
-- function ever ran SQL as the caller, one call could empty a table. This
-- removes all three. SELECT, INSERT, UPDATE and DELETE are untouched.
--
-- Also closes EXECUTE on rls_auto_enable(), an event-trigger helper that
-- exists only on production (Supabase's automatic-RLS setting). It runs on
-- DDL as the database owner; app roles never need to call it.

do $$
declare
  t text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated', t);
  end loop;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
