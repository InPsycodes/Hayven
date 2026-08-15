-- CRITICAL FIX: public.users never got the column-scoped grant treatment
-- that therapist_profiles received in 0021 for the exact same bug class.
-- "users can update own profile" (0002) is row-scoped only (id = auth.uid()),
-- with no WITH CHECK, and 0003's blanket per-table grant loop included
-- `users` -- so any authenticated user could update EVERY column on their
-- own row, including `role` and `status`. Live-verified against the real
-- database with a throwaway account using only the anon key + its own
-- session:
--
--   await supabase.from('users').update({ role: 'admin' }).eq('id', myOwnId)
--
-- ...succeeded and actually flipped the row to role='admin', which
-- `public.current_user_role()` (the function nearly every admin RLS policy
-- gates on) re-reads live -- meaning this was a complete, self-service
-- privilege escalation to full platform admin, no exploit chaining needed.
--
-- Same root cause and same fix shape as 0021 (therapist_profiles):
-- revoke the blanket grant and re-grant scoped to only the columns a user
-- should ever be able to change about themselves. Per 0021's own finding,
-- a column-level REVOKE cannot undo a table-level GRANT that still exists,
-- so the blanket grant must be revoked first, not patched in place.

revoke update on public.users from authenticated;

grant update (
  full_name, phone, updated_at
) on public.users to authenticated;
