-- RLS-05 fix (pre-launch audit, P3): "anyone can view availability" (0002)
-- is unconditional (`using (true)`) -- unlike therapist_public_profiles
-- (verified + banked + active, migration 0092), the raw availability_slots
-- table itself never filtered on the owning therapist's status. Low
-- severity (scheduling times only, not PII) but exposes them for
-- unverified, bankless, or suspended therapists to anyone querying the
-- table directly, bypassing the curated discovery view entirely.
--
-- Safe to narrow: "therapist manages own availability" (0002/0042) is a
-- separate, self-scoped policy (tp.user_id = auth.uid()), so a therapist's
-- own dashboard keeps seeing their own slots regardless of verification
-- status -- this only narrows what OTHER/anonymous viewers can see.

create function public.is_publicly_bookable_therapist(p_therapist_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_profiles tp
    join public.users u on u.id = tp.user_id
    where tp.id = p_therapist_id
      and tp.verification_status = 'verified'
      and tp.bank_account_number is not null
      and u.status = 'active'
  );
$$;
grant execute on function public.is_publicly_bookable_therapist(uuid) to anon, authenticated, service_role;

alter policy "anyone can view availability" on public.availability_slots
  using (public.is_publicly_bookable_therapist(therapist_id));
