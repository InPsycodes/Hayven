-- Consistency fix, not a vulnerability: "admins manage deletion requests"
-- (0036) has no update/delete grant to `authenticated` backing it, unlike
-- the matching pattern for verification_requests (0003_grants.sql grants
-- update/delete there). Not currently reachable -- the admin review path
-- (src/lib/admin/actions.ts's reviewAccountDeletionRequest) exclusively
-- uses the service-role client, which bypasses grants entirely -- so this
-- fails safe today. Fixing anyway so a future admin feature built against
-- the regular per-user client doesn't hit a confusing permission-denied
-- from a gap that looks like an oversight rather than a deliberate choice.

grant update, delete on public.account_deletion_requests to authenticated;
