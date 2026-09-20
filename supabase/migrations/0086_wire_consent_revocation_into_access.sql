-- E6 from the external PRD review: the parent-facing intake form already
-- lets a parent revoke "therapist access" consent (recordIntakeConsent
-- supports granted: false, appended as a new intake_consents row -- it's
-- append-only, never updated). But is_assigned_therapist() -- the one
-- security-definer function nearly every clinical RLS policy calls (goals,
-- target_behaviours, skills, therapy_sessions, the session_* entry tables,
-- reports, and 0083's care-team roster policy) -- only ever checked
-- therapist_child_assignments.status = 'active'. Toggling consent off had
-- zero effect on what a therapist could actually read or write. The
-- consent log was decorative.
--
-- Fix: is_assigned_therapist() now also requires that the child's most
-- recent 'therapist_access' consent decision (if one exists at all) isn't
-- an explicit denial. Default is allow -- a child with no intake_consents
-- row yet (booking exists, intake not started) keeps working exactly as
-- before, since booking and intake are deliberately independent flows.
-- Only an explicit granted=false, and only the LATEST such decision (a
-- parent can grant again after revoking), blocks access.

create or replace function public.is_assigned_therapist(p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.therapist_child_assignments tca
    join public.therapist_profiles tp on tp.id = tca.therapist_id
    where tca.child_id = p_child_id
      and tp.user_id = auth.uid()
      and tca.status = 'active'
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
