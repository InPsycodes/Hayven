-- CRITICAL FIX: public.reports never got the column-scoped grant treatment
-- that therapist_profiles (0021), users (0049), subscriptions/
-- session_abc_observations (0050) received for the exact same bug class.
--
-- "therapist updates own reports" (0022) is scoped by session_id ownership
-- only (`using (is_own_therapy_session(session_id))`), with no WITH CHECK --
-- so Postgres reuses the USING clause as the check, which never references
-- child_id, status, published_at, or approved_by/approved_at. 0012's blanket
-- `grant insert, update, delete on public.reports to authenticated` meant a
-- therapist could update EVERY column on any report row they own via
-- session_id, including reassigning child_id to an arbitrary child and
-- setting status='published' -- fabricating "published" clinical content
-- misattributed to a child the therapist has no relationship to, visible to
-- that child's real parent via "parent views own child published reports"
-- (0014). child_id is set by a trigger, but only BEFORE INSERT, never
-- BEFORE UPDATE, so it's a plain writable column after row creation.
--
-- Same fix shape as 0021/0049/0050: revoke the blanket UPDATE grant and
-- re-grant scoped to only the columns the app's own update paths
-- (saveReport/publishReport in src/lib/reports/actions.ts) ever legitimately
-- write. child_id and session_id are permanently excluded -- reports are
-- immutable on both after creation.

revoke update on public.reports from authenticated;

grant update (
  therapist_body, status, published_at, approved_by, approved_at, updated_at
) on public.reports to authenticated;
