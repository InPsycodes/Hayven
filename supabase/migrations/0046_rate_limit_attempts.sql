-- Application-level rate limiting (login attempts, booking-hold creation),
-- backed by Postgres rather than a new third-party service. This table is
-- an internal control-plane structure, not user data -- RLS is enabled
-- with zero policies (same lockout pattern as audit_log), and every
-- read/write happens through the check_rate_limit() function below, which
-- runs as security definer so it works for both the anon role (login,
-- pre-authentication) and authenticated role (booking holds).

create table public.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  created_at timestamptz not null default now()
);
create index on public.rate_limit_attempts (bucket_key, created_at);

alter table public.rate_limit_attempts enable row level security;

-- Best-effort, not a hard atomicity guarantee: under heavy concurrent
-- requests for the exact same bucket_key, two calls could both read the
-- count before either inserts, letting one extra attempt through. Not
-- worth a `for update`/advisory-lock version for this app's actual
-- traffic -- the goal is blunting brute-force/hammering, not defending
-- against a distributed attack.
create function public.check_rate_limit(p_bucket_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.rate_limit_attempts
    where bucket_key = p_bucket_key
      and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count
    from public.rate_limit_attempts
    where bucket_key = p_bucket_key;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_attempts (bucket_key) values (p_bucket_key);
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
