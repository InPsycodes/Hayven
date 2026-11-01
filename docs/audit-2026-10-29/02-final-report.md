# Hayven audit, 29 October to 1 November 2026: final report

Functionality, security, privacy and production-readiness audit of the Hayven platform (Next.js on Vercel, Supabase, Flutterwave). Detailed evidence is in `00-discovery-and-plan.md` and `01-phase3-4-results.md`; every test named here is in the repository and can be re-run.

## Verdict

**Ready for a limited pilot with real families, once the two owner actions marked "before pilot" below are done.**

No Critical findings. The one High finding (no database backup) is mitigated: an encrypted nightly backup of production now runs, and its restore was rehearsed end to end. Every other confirmed finding is fixed, or is low impact with a known fix.

The evidence rests on testing the access rules directly, not on reading code. One family's full records were attacked from the other family's account, an unassigned therapist's account, and while logged out: every attempt was refused. All 41 admin-only functions were called as a parent and as a therapist: all refused. 32 browser journeys passed across the four roles. Production was probed only read-only and logged out; all write and cross-account testing used the staging project and synthetic people.

## Before the pilot (owner)

1. **Upgrade Supabase to Pro and enable point-in-time recovery.** The nightly backup can lose up to a day of bookings, notes and payments; PITR narrows that to minutes. (F-12)
2. **Clinical review by Dr Abike** of report wording, assessment content and recommendations. The audit did not change or judge clinical content.

## Soon after (owner)

3. ~~Run `security-fingerprint.sql` on production~~ Done 1 November (see "Production compared with the code" below). Apply migration 0114 in the production SQL Editor, then re-run the fingerprint: table grants should read 142 and column grants 1024.
4. Add the staging secrets so integration tests run on every push: `INTEGRATION_SUPABASE_URL`, `INTEGRATION_SUPABASE_ANON_KEY`, `INTEGRATION_SUPABASE_SERVICE_ROLE_KEY` (staging project values, never production).
5. A short manual screen-reader pass (NVDA on Windows, VoiceOver on a phone) of sign-up, booking and the intake form.
6. Check existing PostHog persons for query strings recorded before the F-10 fix, and delete any.
7. Resolve Flutterwave's IP whitelisting requirement for transfers (the support request discussed in October). Until then, therapist payouts can't be sent from Vercel.

## Findings register

| ID | Severity | Title | Status |
|---|---|---|---|
| F-12 | High | No working database backup (Free plan, no PITR; documented fallback needed Docker) | **Mitigated**: encrypted nightly `pg_dump` to R2, first production run 1 Nov; restore rehearsed (121/121 tests on the restored DB). Owner: Pro plus PITR |
| F-10 | Medium | PostHog could store a visitor's first URL, query string included, as a person property | **Fixed** (e922ead) |
| F-14 | Medium | Text below WCAG AA contrast in the dashboards (labels 3.9:1, buttons 3.5:1) | **Fixed** (1d316bb) |
| F-16 | Medium (likely) | The CI workflow referenced `secrets` in a job-level `if:`, which GitHub rejects, invalidating the whole file: build, typecheck, lint, unit tests and the dependency audit have probably not run on push since 8 October. Not confirmed from the run history, which this audit couldn't read | **Fixed** (be3367b). Owner: confirm the next push shows a green CI run |
| F-01 | Low | Two internal helpers were publicly callable server actions (not exploitable) | **Fixed** (65c29cf) |
| F-02 | Low | Payment finalisation could be called in bulk to make outbound Flutterwave calls | **Fixed** (944088b): rate-limited |
| F-04 | Low | Two token-carrying pages could be served from the offline cache | **Fixed** (944088b) |
| F-07 | Low | The anonymous role held SELECT on every table, RLS the only barrier | **Fixed** (77b7043, migration 0113 applied to production and verified) |
| F-08 | Low | Analytics URLs carried child and thread ids | **Fixed** (e922ead) |
| F-09 | Low (latent) | Google Analytics would have sent full URLs if enabled | **Fixed** (e922ead) |
| F-13 | Low | A network error while reserving a slot said "booked by someone else"; a lost response can leave a slot marked booked with no booking | Message **fixed** (19fa584). Stuck slot open: see "Known gaps" |
| F-15 | Low | Home page's illustrative dashboard announced as real navigation | **Fixed** (1d316bb) |
| F-17 | Low | zod below 4.6.6 (memory exhaustion advisory, GHSA-mrhx-c7xc-m3w5) in build tooling; failed the CI audit | **Fixed** (28fcfdd). 7 moderate advisories remain in Sentry and serwist build tooling, none shipped to browsers, no non-breaking fix |
| F-03 | Info | Unsubscribe links never expire | Accepted (toggles email preferences only) |
| F-05 | Info | Logged-out visitors can see which listed slots are booked | Accepted |
| F-06 | Info | Two responses minutes after a deploy lacked security headers; not reproduced | Recheck after deploys |
| F-11 | Info | A supervisor opening another team's therapist gets an empty page, not a 404 | Accepted (no data shown) |

## What was tested

| Area | Evidence | Result |
|---|---|---|
| Logged-out access to production | Anonymous-key probes of every table, storage, headers, redirects, CORS, source maps, cron and webhook endpoints | Only intended public data readable; webhook rejects unsigned and wrongly signed requests (401) |
| Cross-account isolation | `cross-user-isolation` (12 tests): reads, edits, ownership transfer, inserts across families and therapists | All refused |
| Admin authorisation | `admin-function-level-auth`: all 41 admin and safeguarding functions called as parent, therapist, admin | Non-admins refused on all 41 |
| Regression suite | 25 integration files, 132 tests (RLS, reports, PDFs, refunds, payouts, races, purges, offboarding, payment edge cases) | Pass (121 on the restored database, then the 11 new payment tests) |
| Payments | `payment-edge-cases` (11): declined, pending, wrong currency, underpaid, foreign reference, Flutterwave unreachable, webhook and redirect together, overpayment, abandoned and live holds | Pass. Never confirms a booking a payment didn't cover; a double delivery confirms once with one payment record |
| Browser journeys | `npm run test:e2e`: 32 journeys, all four roles, desktop and phone | Pass |
| Accessibility | axe-core on 21 pages; 16 keyboard-only checks (skip link, focus visibility, login, sign-up, booking, intake, menus) | Pass after fixes |
| Analytics privacy | Unit tests on every event property; browser check that no request reaches a third party | Pass after F-08 to F-10 fixes |
| Load | k6, 30 concurrent users for 3.5 minutes on staging | 116 req/s, p95 about 190 ms, no cross-family leaks |
| Backup and restore | Dump, wipe, restore on staging; fingerprint compare; full suite on the restored DB | Restored database identical and fully working |

## Known gaps and residual risks

- **Production compared with the code (1 November).** The owner ran the fingerprint and `security-diff.sql` on production:
  - Policies (174), row-level security (58 tables) and triggers (9) are identical to staging.
  - All 17 privileged functions have identical code; the hashes differed only because production stores Windows line endings (pasted into the SQL Editor). Hashing staging's code with CRLF endings reproduces every production hash.
  - Production additionally grants TRUNCATE, REFERENCES and TRIGGER (anon on the 9 public tables, authenticated on all 52), left over from Supabase's old "grant all" default. Not reachable through the API, but TRUNCATE ignores RLS. Migration 0114 revokes them (tested on staging). Nothing that staging grants is missing from production.
  - One extra function, `rls_auto_enable()` (Supabase's automatic-RLS event trigger), executable by app roles; 0114 closes that too.

  Staging values to compare against:

  | Part | Items | Fingerprint |
  |---|---|---|
  | policies | 174 | b7bc9b61d31ed899bf2ad22519387dcb |
  | rls | 58 | 2f3f375ca58e3fc0398a8b7c34a84d33 |
  | table grants | 142 | 4937beaff8ff4d6918d1ea026d0cf6d5 |
  | column grants | 1024 | 7402d12afde04378db14de4a848a9bbc |
  | definer functions | 17 | 574d4e7f43fff37d22b7a26d766cd4d9 |
  | function execute | 22 | 8fa0eb6cb25e3b817563f9b511ea776c |
  | triggers | 9 | 7e96cb9a8f21835fdd0a7f88a3dab9dc |

  A mismatch isn't necessarily a problem (a policy edited in the dashboard, say), but each one should be explained before the pilot grows.
- **Real Flutterwave checkout** was tested only up to the payment summary in the browser; confirmation logic was tested against a stand-in for Flutterwave. Make one small real payment and refund at pilot start.
- **Stuck slot (F-13).** Safe cleanup needs a migration: record when a slot was held (`held_at`), and add a unique index allowing one active booking per slot. A sweep could then free slots held over 30 minutes with no booking without any risk of double booking.
- **MFA is off for all roles, admins included** (owner decision, 9 October; DPIA risk #1). A stolen admin password gives full access. Reconsider before the pilot grows beyond the founding team.
- **Admin page speed** on production is unmeasured; local timings were distorted by the test machine's network.
- Automated accessibility rules catch roughly a third of real barriers; the manual screen-reader pass covers more.

## Deployment and rollback

- **Code:** Vercel builds every push to `main`. To roll back: Vercel, Deployments, the last good one, **Promote to Production** (seconds). Rolling back code does not roll back the database.
- **Database migrations** are forward-only and applied by hand in the SQL Editor. Before any migration: confirm last night's backup exists in R2. Write migrations so the previous app version still works with the new schema; then a code rollback stays safe.
- **Data recovery:** `docs/backup-restore-drill.md`. Today: the nightly dump (up to 24 hours of loss). After Pro: point-in-time recovery.
- **Incidents:** `SECURITY.md` (containment, NDPC notification) and `docs/breach-response-runbook.md`.

## Re-running the audit

| Command | What it checks | Where |
|---|---|---|
| `npm test` | Unit tests, migration guards | Local, CI |
| `npm run test:integration` | Access rules, payments, races (staging) | Local, CI once secrets are set |
| `npm run test:e2e` | Journeys, accessibility, keyboard (staging build) | Local |
| `npm run test:privacy` | Analytics requests carry no personal data | Local |
| `npm run test:load` | Load and isolation under load (staging, needs k6) | Local |
| `security-fingerprint.sql` | Production policies match the code | SQL Editor |
