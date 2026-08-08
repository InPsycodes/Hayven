-- Bug fix for 0033, caught by live testing: wrapping the "child already has
-- an active assignment" check in a security definer function fixed the
-- infinite-recursion error, but the check still silently evaluated to false
-- when run as part of therapist_child_assignments' own INSERT WITH CHECK --
-- confirmed empirically: calling child_has_active_assignment(child_id) as a
-- standalone RPC returned true for a child with a real active row, but the
-- exact same call embedded in the INSERT statement on
-- therapist_child_assignments itself returned false, causing every insert
-- (legitimate and malicious alike) to be rejected. This is Postgres's
-- recursion-avoidance machinery treating the self-referential subquery as
-- empty for that nested evaluation, even through a security definer
-- function boundary -- querying a table from within a policy defined on
-- that same table is fragile in a way querying a different table isn't.
--
-- Fix: stop referencing therapist_child_assignments from its own policy.
-- Use public.bookings instead -- a child becomes an established Hayven
-- client once they have a real confirmed/completed booking with any
-- therapist, which is actually the more fundamental signal anyway (it's the
-- exact same one "therapist self-assigns from a booking", 0011, already
-- keys off).

drop policy "supervisor assigns team therapist to existing client" on public.therapist_child_assignments;
drop function public.child_has_active_assignment(uuid);

create function public.child_has_confirmed_booking(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings
    where child_id = p_child_id and status in ('confirmed', 'completed')
  );
$$;
grant execute on function public.child_has_confirmed_booking(uuid) to authenticated, service_role;

create policy "supervisor assigns team therapist to existing client" on public.therapist_child_assignments
  for insert with check (
    public.is_supervisor_of_therapist(therapist_id)
    and public.child_has_confirmed_booking(child_id)
  );
