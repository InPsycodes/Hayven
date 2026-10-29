# Backlog

Known, deliberately-deferred work. Not a full roadmap — just items that were
scoped out of a specific pass and shouldn't get lost.

## Before launch: therapist payouts blocked by Flutterwave IP whitelisting

**Status:** open, blocks automatic payouts (test and live). Found 2026-10-28
on the first payout run with a real key: Flutterwave refused the transfer
with "Please enable IP Whitelisting to access this service". Payments,
refunds, bank-account checks and webhooks all work; only transfers
(`createTransfer`, used by **Admin → Payouts**) need it.

The failed run was handled cleanly: the payout row is `failed` with that
reason, no money moved, and the earning went back to pending for a retry.

The catch is that Vercel functions have no fixed outbound IP, so there is
nothing to whitelist. In order of preference:

1. Ask Flutterwave support to disable IP whitelisting for transfers on the
   account (asked 2026-10-28; record their answer here).
2. If they refuse, pay therapists by hand from the Flutterwave dashboard
   during the pilot and mark each payout paid in Hayven. Fine while there
   are only a few therapists.
3. Once volume justifies the cost: Vercel static outbound IPs (paid
   add-on), or route transfer calls through a static-IP proxy such as
   QuotaGuard or Fixie. Either way, list the IPs under Flutterwave
   **Settings → Whitelisted IP addresses**, for test and live separately.

Retest with the cleared ₦16,000 test earning for Teresa John (test
therapist) before deleting the test data.

## Retire the old session-notes system

**Status:** done. The premise this was deferred on (both dashboard widgets
still depending on the old system) turned out to be stale by the time this
was picked back up — `/parent` and `/therapist` had already been migrated to
`therapy_sessions`/`reports` in an earlier pass. Removed as pure dead-code
cleanup: `src/lib/session-notes/`, `src/components/session-report/`,
`src/app/(app)/therapist/sessions/` (the orphaned old report route),
`getRealReportsDueForTherapist`, the "Session notes" sidebar entry, and
`src/data/mutations.ts` (unrelated dead fixture-era scaffold, found in the
same pass). The `session_notes`/`progress_goals` tables were deliberately
left in place at the schema level — nothing reads or writes them anymore,
but dropping them was out of scope for this pass.
