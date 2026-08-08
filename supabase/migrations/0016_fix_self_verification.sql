-- Security fix: therapist_profiles got a blanket grant, insert/update/delete
-- included, back in 0003 (it was looped over "every table", with no reason
-- yet to think about column-level access). That means any therapist could
-- currently PATCH their own verification_status straight to 'verified' (and
-- verified_badge_label to anything) via the normal authenticated client --
-- "public can view verified therapists" (0002_rls.sql) trusts that column
-- directly, so this was a full self-verification bypass.
--
-- These two columns are already only ever written from the admin side, via
-- createAdminClient() (service-role, bypasses grants/RLS entirely) in
-- reviewVerificationRequestReal -- src/lib/admin/actions.ts. The normal
-- signup upsert (src/lib/therapist/actions.ts) never touches either column
-- and relies on the table's own `default 'pending'`. So revoking these two
-- columns from authenticated changes nothing about legitimate app behaviour,
-- same as the existing confidential_note / reviewer_notes / debug_payload
-- column locks elsewhere in this schema.

revoke insert (verification_status, verified_badge_label) on public.therapist_profiles from authenticated;
revoke update (verification_status, verified_badge_label) on public.therapist_profiles from authenticated;
