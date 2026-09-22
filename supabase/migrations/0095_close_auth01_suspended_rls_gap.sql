-- AUTH-01 fix (pre-launch audit, P0): suspending an account never revoked
-- its RLS-level access -- only the app-layer getSession() check did. None
-- of the core SECURITY DEFINER helper functions checked users.status, so a
-- suspended user's already-issued Supabase Auth token stayed fully valid
-- against every RLS policy for as long as the token itself lived. Live-
-- reproduced: suspended a real therapist mid-session and their
-- pre-suspension token could still read an assigned child's record and
-- query that child's goals.
--
-- Fix: every helper that authorizes based on "who is calling" now also
-- requires that caller's own users.status = 'active'. A suspended account
-- fails every RLS check immediately, regardless of token validity -- this
-- is the one place that's actually authoritative for every direct-API-call
-- surface, not just the ones routed through getSession().

create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_parent_of_child(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    join public.users u on u.id = auth.uid()
    where c.id = p_child_id and c.parent_id = auth.uid() and u.status = 'active'
  );
$$;

create or replace function public.is_assigned_therapist(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_child_assignments tca
    join public.therapist_profiles tp on tp.id = tca.therapist_id
    join public.users u on u.id = auth.uid()
    where tca.child_id = p_child_id
      and tp.user_id = auth.uid()
      and tca.status = 'active'
      and u.status = 'active'
  )
  and coalesce(
    (
      select ic.granted
      from public.intake_consents ic
      where ic.child_id = p_child_id
        and ic.consent_type = 'therapist_access'
      order by ic.recorded_at desc, ic.id desc
      limit 1
    ),
    true
  );
$$;

create or replace function public.is_supervisor_of_therapist(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.supervisor_assignments sa
    join public.users u on u.id = auth.uid()
    where sa.supervisor_id = auth.uid()
      and sa.therapist_id = p_therapist_id
      and sa.status = 'active'
      and u.status = 'active'
  );
$$;

create or replace function public.is_supervised_child(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_child_assignments tca
    join public.supervisor_assignments sa on sa.therapist_id = tca.therapist_id
    join public.users u on u.id = auth.uid()
    where tca.child_id = p_child_id
      and tca.status = 'active'
      and sa.supervisor_id = auth.uid()
      and sa.status = 'active'
      and u.status = 'active'
  );
$$;
