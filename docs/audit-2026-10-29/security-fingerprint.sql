-- Read-only fingerprint of the database's security setup, for comparing
-- production with staging (audit 2026-10-29). Run it in the Supabase SQL
-- Editor on each project; if every row's fingerprint matches, the two have
-- the same row-level security, policies, grants and privileged functions.
-- It reads catalog tables only and returns no user data.

with
policies as (
  select schemaname || '.' || tablename || ':' || policyname || ':' || cmd || ':' ||
         array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, '') as line
  from pg_policies
  where schemaname in ('public', 'storage')
),
rls as (
  select c.relname || ':' || c.relrowsecurity || ':' || c.relforcerowsecurity as line
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
grants as (
  select table_name || ':' || grantee || ':' || privilege_type as line
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
),
column_grants as (
  select table_name || '.' || column_name || ':' || grantee || ':' || privilege_type as line
  from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
),
definer_functions as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' ||
         coalesce(array_to_string(p.proconfig, ','), '') || ':' || md5(p.prosrc) as line
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
),
function_execute as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' ||
         has_function_privilege('anon', p.oid, 'execute') || ':' ||
         has_function_privilege('authenticated', p.oid, 'execute') as line
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
triggers as (
  select c.relname || ':' || t.tgname || ':' || md5(pg_get_triggerdef(t.oid)) as line
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'auth') and not t.tgisinternal
)
select 'policies' as part, count(*) as items, md5(string_agg(line, '|' order by line)) as fingerprint from policies
union all select 'rls', count(*), md5(string_agg(line, '|' order by line)) from rls
union all select 'table grants', count(*), md5(string_agg(line, '|' order by line)) from grants
union all select 'column grants', count(*), md5(string_agg(line, '|' order by line)) from column_grants
union all select 'definer functions', count(*), md5(string_agg(line, '|' order by line)) from definer_functions
union all select 'function execute', count(*), md5(string_agg(line, '|' order by line)) from function_execute
union all select 'triggers', count(*), md5(string_agg(line, '|' order by line)) from triggers;
