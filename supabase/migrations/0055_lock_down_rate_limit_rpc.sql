-- Security fix: check_rate_limit() (0046) was granted execute to anon and
-- authenticated so the app's own server-side calls -- made through the
-- anon-key client, per this table's own "internal control-plane" design --
-- would work both pre- and post-login. But that grant makes the function
-- directly callable by ANYONE holding the public anon key (which is public
-- by design) straight against PostgREST's /rpc endpoint, completely
-- bypassing the Next.js server actions that were supposed to be the only
-- caller. Two concrete exploits followed:
--
-- 1. A negative p_window_seconds makes `now() - (p_window_seconds ||
--    ' seconds')::interval` resolve to a FUTURE timestamp, so the cleanup
--    DELETE's `created_at < <future>` matches and wipes every existing row
--    for that bucket_key. Calling this right before a batch of real login/
--    MFA/signup attempts resets the target's rate-limit bucket to empty,
--    giving unlimited guesses -- this defeated essentially all of the rate
--    limiting added this session.
-- 2. Even with sane parameters, direct RPC access lets an attacker pre-fill
--    an arbitrary bucket_key (login:<victim email>, payment-init:<userId>,
--    etc. -- easily inferred from this repo's own source) to the limit,
--    locking a specific victim out of login/payment/upload indefinitely.
--
-- Fix has two parts: the app itself now calls this function through the
-- service-role client (bypasses grants/RLS entirely, same as every other
-- privileged operation in this codebase -- see src/lib/supabase/admin.ts),
-- so the anon/authenticated grant is revoked outright, closing direct
-- external access completely. The parameter clamp below is defense in
-- depth in case this function is ever called some other way in the future.

create or replace function public.check_rate_limit(p_bucket_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
  v_window_seconds int := greatest(p_window_seconds, 1);
  v_limit int := greatest(p_limit, 0);
begin
  delete from public.rate_limit_attempts
    where bucket_key = p_bucket_key
      and created_at < now() - (v_window_seconds || ' seconds')::interval;

  select count(*) into v_count
    from public.rate_limit_attempts
    where bucket_key = p_bucket_key;

  if v_count >= v_limit then
    return false;
  end if;

  insert into public.rate_limit_attempts (bucket_key) values (p_bucket_key);
  return true;
end;
$$;

revoke execute on function public.check_rate_limit(text, int, int) from anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
