-- Corrective fix for a mistake in 0016: it tried to close the
-- self-verification bypass with `revoke update (verification_status, ...)`,
-- but therapist_profiles has a *table-level* `grant ... update ...` from
-- 0003 covering every column. Per Postgres ACL rules (already documented in
-- 0003's own comment, just for the opposite direction: a blanket grant
-- silently undoing a column revoke) -- a column-level REVOKE cannot remove
-- a privilege that was granted at the table level; it only cancels a grant
-- made at that same column-scoped level. 0016 was therefore a no-op.
-- Verified empirically with a real therapist access token: PATCHing
-- verification_status still succeeded after 0016 was applied.
--
-- Real fix, matching how 0003/0012 already handle this for
-- verification_requests/reports: revoke the table-level insert/update grant
-- entirely and re-grant it scoped to every column except
-- verification_status and verified_badge_label.

revoke insert, update on public.therapist_profiles from authenticated;

grant insert (
  user_id, bio, location, session_types, price_per_session,
  years_practicing, photo_url
) on public.therapist_profiles to authenticated;

grant update (
  user_id, bio, location, session_types, price_per_session,
  years_practicing, photo_url, updated_at
) on public.therapist_profiles to authenticated;
