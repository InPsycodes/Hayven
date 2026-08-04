-- Gap in 0002: therapists had a SELECT policy on their own verification
-- requests but no way to actually create one (the "submit for verification"
-- action from the API spec).

create policy "therapist creates own verification request" on public.verification_requests
  for insert with check (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.id = verification_requests.therapist_id and tp.user_id = auth.uid()
    )
  );
