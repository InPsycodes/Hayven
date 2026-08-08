-- Bugfix, same class as 0027: supervisors got a SELECT policy on
-- public.users for their team's therapists, but the parallel gap on
-- public.therapist_profiles itself was missed. "public can view verified
-- therapists" only matches verification_status = 'verified', so an
-- unverified (still pending/rejected/flagged) team member's
-- therapist_profiles row -- and therefore their name, via the nested
-- users(full_name) embed in src/lib/supervisor/queries.ts's
-- getMySupervisedTherapists -- silently disappears from a supervisor's
-- team list instead of showing up.

create policy "supervisor views team therapist profiles" on public.therapist_profiles
  for select using (public.is_supervisor_of_therapist(id));
