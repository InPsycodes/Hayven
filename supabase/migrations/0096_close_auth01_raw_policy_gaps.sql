-- AUTH-01 follow-up: 0095 fixed every SECURITY DEFINER helper function, but
-- testing (not review) found several RLS policies check identity directly
-- (`parent_id = auth.uid()`, `user_id = auth.uid()`, an inline EXISTS
-- against therapist_profiles.user_id) instead of going through a helper --
-- so they never picked up 0095's status check. Caught live: a suspended
-- parent's pre-suspension token could still read their own child's row via
-- "parents manage own children" on public.children, which 0095 didn't
-- touch because that policy was never routed through is_parent_of_child()
-- in the first place.
--
-- Fix: one small reusable helper, applied to every raw identity check on a
-- table that holds child/clinical/scheduling/payment data. Left alone on
-- purpose: purely self-scoped, non-clinical tables (a user's own profile
-- row, notification prefs, support requests, learning progress) -- a
-- suspended user still being able to see why they're suspended, or their
-- own inert settings, isn't the exposure this is closing.

create function public.caller_is_active()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and status = 'active');
$$;
grant execute on function public.caller_is_active() to authenticated, service_role;

alter policy "parents manage own children" on public.children
  using (parent_id = auth.uid() and public.caller_is_active());

alter policy "assigned therapists can view children" on public.children
  using (
    exists (
      select 1 from public.bookings b
      join public.therapist_profiles tp on tp.id = b.therapist_id
      where b.child_id = children.id and tp.user_id = auth.uid()
    )
    and public.caller_is_active()
  );

alter policy "therapist manages own profile" on public.therapist_profiles
  using (user_id = auth.uid() and public.caller_is_active());

-- bookings: only the two SELECT policies still exist -- every write policy
-- (parent creates/updates, therapist updates) was already deliberately
-- dropped by 0018/0030/0078, since the app only ever writes bookings
-- through the service-role client (which bypasses RLS entirely), so there
-- was nothing unsafe left there to begin with.
alter policy "parent views own bookings" on public.bookings
  using (parent_id = auth.uid() and public.caller_is_active());

alter policy "therapist views own bookings" on public.bookings
  using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = bookings.therapist_id and tp.user_id = auth.uid()
    )
    and public.caller_is_active()
  );

alter policy "users view own payments" on public.payments
  using ((payer_id = auth.uid() or payee_id = auth.uid()) and public.caller_is_active());

alter policy "parent views own disputes" on public.booking_disputes
  using (parent_id = auth.uid() and public.caller_is_active());
