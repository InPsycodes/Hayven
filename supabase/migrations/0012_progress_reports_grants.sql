-- Same root cause as 0003 and 0005: tables created via raw SQL do not
-- inherit Supabase's default grants. Without this file every table added in
-- 0010 returns "permission denied" for authenticated no matter how correct
-- the RLS in 0011 is.

-- Blanket grants for every new table EXCEPT therapy_sessions and reports,
-- which need column-level handling to preserve the 0011 revokes.
do $$
declare t text;
begin
  foreach t in array array[
    'therapist_child_assignments', 'child_diagnoses', 'goals', 'target_behaviours',
    'skills', 'session_behaviour_entries', 'session_skill_entries',
    'session_goal_progress', 'session_reinforcers'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- therapy_sessions: every column EXCEPT confidential_note.
-- >>> ADD ANY NEW COLUMN TO THIS LIST OR IT WILL BE INVISIBLE TO THE APP. <<<
grant select (
  id, child_id, therapist_id, booking_id, session_date, duration_minutes,
  therapy_type, setting, status, therapist_notes, created_at, updated_at
) on public.therapy_sessions to authenticated;
grant insert, update, delete on public.therapy_sessions to authenticated;

-- reports: every column EXCEPT debug_payload.
grant select (
  id, session_id, status, therapist_body, parent_body, model_version,
  prompt_version, generation_ms, input_snapshot, token_usage, attempt_count,
  error_code, error_message, requested_by, generated_at, approved_by,
  approved_at, published_at, created_at, updated_at
) on public.reports to authenticated;
grant insert, update, delete on public.reports to authenticated;

-- No anon grants: none of this is public data.

-- service_role: 0005 set default privileges, but those only apply to tables
-- created by the same role that ran that statement. Re-issue explicitly
-- (idempotent, harmless) so the Edge Function's service-role client works.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on function public.is_assigned_therapist(uuid) to authenticated, service_role;
grant execute on function public.is_parent_of_child(uuid) to authenticated, service_role;
