-- 0084 was ineffective. A plain `revoke select (col) ... from anon,
-- authenticated` cannot override the blanket `grant select on
-- therapist_profiles to anon, authenticated` that migration 0003's grant
-- loop already issued -- Postgres checks table-level and column-level ACLs
-- independently and allows access if EITHER permits it, so the older,
-- broader table grant kept the "revoked" columns readable. Confirmed via
-- information_schema.column_privileges against production: anon and
-- authenticated both still showed SELECT on all four bank columns after
-- 0084 ran. This is precisely what 0003's own comment warns about for
-- verification_requests, and the same rule applies here -- 0084 just
-- didn't apply it.
--
-- Real fix, mirroring 0003's verification_requests handling: revoke the
-- table-wide SELECT grant outright, then re-grant SELECT on an explicit
-- column allowlist that excludes the four bank/payout columns. Column list
-- taken from the live schema (17 columns on therapist_profiles), minus
-- bank_code, bank_account_number, bank_account_name, paystack_recipient_code.

revoke select on public.therapist_profiles from anon, authenticated;

grant select (
  id, user_id, bio, location, session_types, price_per_session,
  verification_status, verified_badge_label, created_at, updated_at,
  years_practicing, photo_url, report_tone
) on public.therapist_profiles to anon, authenticated;
