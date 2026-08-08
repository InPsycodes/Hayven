-- Bugfix: 0025 gave supervisors read access to the clinical tables (children,
-- therapy_sessions, etc.) but missed public.users itself. users.role/select
-- was already locked to "own row or admin" (0002_rls.sql), so a supervisor
-- could see a supervised therapist's therapist_profiles row (once verified)
-- but the nested users(full_name) embed always came back null -- there was
-- no name to show anywhere a supervisor lists their team.

create policy "supervisor views team therapist user profiles" on public.users
  for select using (
    exists (
      select 1 from public.therapist_profiles tp
      where tp.user_id = users.id and public.is_supervisor_of_therapist(tp.id)
    )
  );
