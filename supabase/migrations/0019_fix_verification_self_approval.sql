-- Security fix: "therapist creates own verification request" only checked
-- that therapist_id maps to the caller's own profile, not the values being
-- inserted -- a therapist could INSERT a row with status: 'approved',
-- admin_id: <any real admin's uuid>, reviewed_at: now(), fabricating a
-- plausible-looking reviewed/approved record. The real gate
-- (therapist_profiles.verification_status) is unaffected by this row on its
-- own -- see 0016 -- but nothing should let a therapist write a fake
-- approval trail. src/lib/therapist/actions.ts only ever inserts
-- { therapist_id, status: "submitted" }, so this tightening changes nothing
-- about legitimate app behaviour.

drop policy "therapist creates own verification request" on public.verification_requests;
create policy "therapist creates own verification request" on public.verification_requests
  for insert with check (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = verification_requests.therapist_id and tp.user_id = auth.uid()
    )
    and status = 'submitted'
    and admin_id is null
    and reviewed_at is null
  );
