-- Closes a live, unauthenticated leak of therapist bank details, found in
-- an external PRD review and independently confirmed by reading the actual
-- grants: migration 0003's blanket `grant select on every table to anon`
-- covers therapist_profiles, and the "public can view verified therapists"
-- policy (0002) is row-level only -- RLS cannot restrict columns. The bank
-- columns added in 0074 (bank_account_number, bank_code, bank_account_name,
-- paystack_recipient_code) never got a matching column-level revoke, so any
-- anon or authenticated caller could select any verified therapist's bank
-- account details directly via the REST API, no login required.
--
-- Same treatment already used for confidential_note (0011) and
-- verification_requests.reviewer_notes (0003): revoke the columns outright.
-- The app's two legitimate self-reads (getBankDetails in
-- src/lib/payouts/queries.ts, the hasBankAccount check in
-- src/lib/therapist/onboarding.ts) now go through the service-role client
-- with an explicit ownership re-check, mirroring getConfidentialNote.
-- updateBankDetails (the write path) is unaffected -- SELECT and
-- UPDATE/INSERT are separate grants, and that action never selects these
-- columns back.

revoke select (bank_account_number, bank_code, bank_account_name, paystack_recipient_code)
  on public.therapist_profiles from authenticated, anon;
