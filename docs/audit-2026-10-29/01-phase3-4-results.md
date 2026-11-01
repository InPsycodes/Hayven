# Hayven audit, 29 October 2026: phases 3 and 4 results

Production was probed **read-only and logged out only**, using the public anonymous key that every browser already receives. No accounts were used, nothing was written, and no row contents were read: only counts and field names. Code review covered every server action and API route. Commit at time of testing: `90de9e0`.

## Phase 2: baseline

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass |
| Lint (`eslint .`) | 0 errors, 5 pre-existing warnings (unused test helpers) |
| Unit tests (`npm test`) | 93 of 93 pass |
| Production build (`next build`) | Pass, 86 static pages |
| Integration tests | **Blocked**: the test project `sfvw…` no longer resolves (DNS failure) |
| Dependency audit | Next.js (3 advisories), Sentry and DOMPurify fixed today in `c214ded` and `f5114f0`. 20 remain, all in dev or build tooling, none shipped to the site. |
| Secret scan, tracked files and full git history | No live secrets. Matches were placeholders: the DB URL example in `SECURITY.md`, the dummy Flutterwave key in `test/integration/env.ts`, `sk_test_integration_placeholder`. Only `.env.local.example` is tracked. |
| Variables exposed to the browser (`NEXT_PUBLIC_*`) | Supabase URL and anon key, PostHog key, Sentry DSN, GA ID, site URL, VAPID public key. All public by design; no secrets. |
| Database migration state | 112 migrations in the repo. Production at least through `0112` (verified 28 October by column probes). Full live schema comparison needs read-only DB access. |

## Phase 3: read-only, logged-out probes of production

| ID | Test | Result | Status |
|---|---|---|---|
| P3-01 | Query all 58 tables plus the public profile view with the anonymous key | Sensitive tables (children, bookings, messages, payments, users, credentials, session notes, notifications, reviews, subscriptions) return **0 rows**. Only intended public data comes back: Learning Center articles and categories, specialties, therapist specialties, the public therapist profile view, availability slots. | **Pass** |
| P3-02 | Fields returned to anonymous visitors | Profiles: bio, location, session types, price, experience, badge, display name, specialties, photo. Slots: id, therapist, start, end, `is_booked`, session type. No contact details or family data. | **Pass** (see F-05) |
| P3-03 | List storage buckets as anonymous | 0 buckets visible | **Pass** |
| P3-04 | List the `credentials` and `avatars` buckets as anonymous | 0 entries visible in either | **Pass** |
| P3-05 | Fetch `credentials` through the public-object URL path | Rejected (400) | **Pass** |
| P3-06 | Security headers on 11 public pages and the API | CSP, X-Frame-Options and HSTS present on all, on repeated requests. Two misses minutes after a deploy did not reproduce (F-06). | **Pass** (F-06 open) |
| P3-07 | `/parent` while logged out | 307 to `/login?next=/parent` | **Pass** |
| P3-08 | Open redirect via `/auth/callback?next=` with four payloads | All sent to `/login?error=…`, none off-site | **Pass** |
| P3-09 | CORS from a foreign origin on the API | No `Access-Control-Allow-Origin` returned | **Pass** |
| P3-10 | HTTP to HTTPS | 308 redirect | **Pass** |
| P3-11 | JavaScript source maps | 403, and no `sourceMappingURL` in bundles | **Pass** |
| P3-12 | Cron endpoints without the secret (GET and POST) | 401 or 405 | **Pass** |
| P3-13 | Admin seed endpoint while logged out | 401 or 405 | **Pass** |
| P3-14 | `/api/health` | Returns only `{"status":"ok"}` | **Pass** |

## Phase 4: code review of privileged paths

- **110 exported server actions** found. Every exported function in a `"use server"` file can be called directly from a browser.
- 100 read the session before acting. Of the 10 that don't, 4 are public by design and rate-limited (sign-up, sign-out, the paediatrician referral form, the launch waitlist). The other 6 were reviewed by hand (F-01 to F-03).
- **56 actions** take a record ID and use the service-role client: 30 are admin-gated, 19 show an ownership check, 5 are clinic actions gated by `requireAdmin()`, 2 are public forms.
- **No ownership gap was found statically.** A static scan shows that a check exists, not that it is correct. Cross-account tests on staging (phase 5) are still required before this can be called verified.
- **API routes:** cron jobs check `Authorization: Bearer $CRON_SECRET` with a constant-time comparison. The seed endpoint is admin-only. The PDF route re-checks authorship, supervision or parenthood. The Flutterwave webhook verifies its secret hash (constant-time, whitespace-trimmed).
- **PWA cache:** all signed-in areas and `/api/*` are network-only; only public pages and assets are cached.

## Findings register (phases 3 and 4)

| ID | Severity | Confidence | Title | Status |
|---|---|---|---|---|
| F-01 | Low | Confirmed | `notifyParentReportPublished` and `cancelBookingsForDepartedTherapist` are internal helpers exported from `"use server"` files, so they are publicly callable endpoints. Not exploitable today: both need a live database client as the first argument, which a browser cannot send, so calls fail before doing anything. | **Fixed** (65c29cf): moved to server-only modules |
| F-02 | Low | Confirmed | `finalizeFromTransaction` (public, no rate limit) makes the server call Flutterwave's verify API for any numeric ID. It cannot fake a payment (Flutterwave re-verification, idempotent finalise) but can be used to make bulk outbound API calls. | **Fixed** (944088b): 20 per IP per 10 minutes |
| F-03 | Informational | Confirmed | Unsubscribe tokens are HMAC-signed and compared in constant time, but never expire. This is common for email links, and the token only toggles email preferences. | Accept or add an expiry |
| F-04 | Low | Confirmed | Two pages carrying personal input or tokens are not on the service worker's never-cache list: `/signup/finish` (phone and terms) and `/unsubscribe?t=…` (personal token in the URL). They could be served from cache on a shared device. | **Fixed** (944088b): both network-only, with `/reset-password` |
| F-05 | Informational | Confirmed | Anonymous visitors can see `is_booked` on availability slots, revealing when a listed therapist has sessions. No family data. | Accept, or expose free slots only |
| F-06 | Informational | Unconfirmed | Two requests to `/` minutes after a deploy lacked CSP, X-Frame-Options and HSTS. Nine later requests and ten other pages all had them. Likely a deployment switchover. | Recheck after future deploys |
| F-07 | Low (hardening) | Confirmed | Migration `0003` grants SELECT to the **anonymous** role and full CRUD to `authenticated` on every public table, so row-level security is the only barrier. It holds today (P3-01), but one future table created without RLS would be exposed instantly. | **Fixed**: migration 0113 revokes anon from every table except the eight public ones, applied to production 31 October and re-probed with the anon key (only those eight and the discovery view readable; `children`, `payments`, `payment_webhook_events` denied; storage closed; home, search, Learn and a therapist profile load). CI guard in `supabase/migrations.test.ts` checks RLS and anon grants on every new table |

Signed-in, cross-account and write-path testing followed on staging (below). The final verdict and the full register are in `02-final-report.md`.

## Phase 5 (started 30 October): staging and cross-account tests

**Staging:** the `hayven_load_test` Supabase project (`sfvw…`) was restored from pause. It held only synthetic accounts (`@hayven.test`, `@hayven-test.dev`) and stopped at migration `0103`. Migrations `0104` to `0112` were applied in order, each in its own transaction with enum additions run first, and recorded in `supabase_migrations.schema_migrations`. A guard in the apply script refuses any connection string that isn't this project.

**Existing integration suite:** 22 files, **105 of 105 tests pass** against the updated staging schema. This covers suspended-account lockout, report approval and PDF access, supervisor scope, consent revocation, bank-column privacy, offboarding, refund races, webhook dedup and role self-escalation.

**New: `test/integration/cross-user-isolation.integration.test.ts`**, 12 tests, **all pass.** One family's full record set (child, intake, booking, payment, message, notification, diagnosis, session, published report, credential file) is built; then:

| ID | Actor | Attempt | Result |
|---|---|---|---|
| X-01 | Parent A (control) | Read own child, intake, booking, payment, message, notification, published report | Allowed |
| X-02 | Therapist A, assigned (control) | Read the child, intake, diagnosis, session, report | Allowed |
| X-03 | Parent B | Read each of parent A's nine record types | 0 rows each |
| X-04 | Parent B | Rename parent A's child, or set its `parent_id` to themselves | No change |
| X-05 | Parent B | Hand their own child to parent A via `parent_id` | No change |
| X-06 | Parent B | Insert a booking for parent A's child; post a message into parent A's booking | Rejected; message count unchanged |
| X-07 | Therapist B, unassigned | Read each of child A's record types | 0 rows each |
| X-08 | Therapist B, unassigned | Insert a diagnosis or a session for child A | Rejected |
| X-09 | Therapist A (control) | Download own credential file | Allowed |
| X-10 | Therapist B, parent B, anonymous | Download or list therapist A's credential file | Denied |
| X-11 | Therapist B | Read therapist A's credential rows | 0 rows |
| X-12 | Anonymous | Read each family record type | 0 rows each |

Reads select only the key column, so a pass can't come from a column-level refusal hiding a row-level leak.

## Admin function-level authorisation (30 October)

`test/integration/admin-function-level-auth.integration.test.ts` finds every server action gated on the admin role or safeguarding lead (41) by scanning the source, and calls each directly. **All 41 refuse a signed-in parent and a signed-in therapist for an authorisation reason** (a redirect to `/login` or an auth error, not a validation error on dummy arguments). **A real admin gets past the gate on all 41** (control).

## Browser journeys (30 October)

`npm run test:e2e`: Playwright against a production build wired to staging (analytics, email, Sentry and push switched off). **32 of 32 pass**: public pages on desktop and phone; logged-out redirects; parent sign-in, intake, search, profile and booking up to the payment summary; log-out; each role blocked by URL from other families' children, unassigned children, an unsupervised team's children, and other roles' areas. The login rate limit (5 per email per 15 minutes) was observed working during development.

Observation: `/supervisor/therapists/<id>` returns 200 for a therapist outside the supervisor's team, but shows "0 children": the data query is scoped to the viewer's team. Not a leak; listed as F-11.

## Privacy: analytics (30 to 31 October)

- **Static review.** Every event passes `sanitizeProps`, an allowlist of 12 coarse keys with a 48-character cap. PostHog: autocapture off, session recording off, EU host, proxied via `/ingest`, `sanitize_properties` strips the query string from `$current_url`, `$referrer`, `$referring_domain`. Identify sends the account UUID plus `role` only. Sentry: `sendDefaultPii: false`, EU (Germany) ingest. Google Analytics: code present but **not enabled** on the live site (no tag, and the CSP would block it).
- **Unit tests** `src/lib/analytics/events.test.ts` (6, pass): names, email, phone, date of birth, concerns, notes, search text, child id and report text are all dropped; objects, arrays, overlong strings and empty values are dropped.
- **Browser check** `npm run test:privacy` (pass): a parent session with PostHog switched on (dummy key, every request answered locally). PostHog requests carry no child name, email, phone, full name or search text, and **no request goes to any third party** other than Supabase. Limitation: posthog-js would not emit event batches inside an automated browser even with its bot checks spoofed, so event *properties* rest on the unit tests and code review.

| ID | Severity | Confidence | Title | Status |
|---|---|---|---|---|
| F-08 | Low | Confirmed (code) | PostHog's `$current_url` keeps the path, which includes internal ids: `/parent/children/<child id>/…`, `/parent/messages/<thread id>`. Pseudonymous, but linkable to a specific child by anyone with database access, contrary to the rule in `events.ts`. | **Fixed** (e922ead): ids replaced with `:id` in every URL sent |
| F-09 | Low (latent) | Confirmed (code) | If Google Analytics is ever enabled, `capturePageview` sends `page_location: window.location.href`, the full URL including search text, bypassing PostHog's URL cleaning. | **Fixed** (e922ead): sanitised URL only |
| F-10 | Medium | Likely | posthog-js records `$initial_current_url` and `$initial_referrer` as person properties via `$set_once`, outside the three keys `sanitize_properties` cleans. A visitor whose first page is `/search?query=…` could have that query stored on their PostHog person. Not observable in an automated browser. | **Fixed** (e922ead): a `before_send` hook cleans every URL-valued property, `$set` and `$set_once` included. Owner: check existing PostHog persons for old query strings |
| F-11 | Informational | Confirmed | `/supervisor/therapists/<id>` returns 200 (empty) rather than 404 for a therapist outside the viewer's team | Accept, or 404 for consistency |

## Backups and recovery (31 October)

| ID | Severity | Confidence | Title | Status |
|---|---|---|---|---|
| F-12 | **High** | Confirmed | **No working database backup.** Production is on the Supabase Free plan (owner confirmed 31 October): no managed backups, no point-in-time recovery. The fallback in `SECURITY.md` (`npx supabase db dump`, "no separate Postgres tools needed") fails without Docker (`LegacyDockerRunError`, reproduced). `storage-backup.yml` covers only Storage objects and is skipped until its secrets exist. Loss or corruption of the database today could be unrecoverable: children's records, sessions, reports, payments. | Mitigated in code, open for the owner. `.github/workflows/db-backup.yml` takes an encrypted nightly `pg_dump` to R2 (runs once its three secrets are set). Restore rehearsed on staging: dump, wipe, restore, fingerprint identical, integration suite 121/121 on the restored database (`docs/backup-restore-drill.md`). Secrets set and the first production backup ran successfully on 1 November 2026. Owner: upgrade to Pro and enable PITR. |
| F-13 | Low | Confirmed | A network error during the booking slot hold was shown to parents as "This slot was just booked by someone else", sending them to pick another time when a retry would do. If the hold update is applied but its response is lost, the slot also stays marked booked with no booking, and nothing releases it. | Message fixed (a request error now says "please try again" and is logged). Stuck slot: open, low impact; a nightly sweep releasing `is_booked` slots with no booking would close it |

## Restored database: full re-test (31 October)

After the restore rehearsal, on the restored staging database:

- Integration suite: **121 of 121 passed**. Two earlier runs failed 14 and 11 tests at random; every failure was `fetch failed` while creating or signing in test users. A probe showed the cause: about 1% of new connections from the test machine to Supabase time out at the 10-second connect stage when many open at once (0 of 150 sequential requests failed; 4 of 300 at 50 in parallel). The suite now retries only connect-stage errors, where the server never received the request, so nothing can be applied twice.
- Browser journeys: **32 of 32 passed**.

## Accessibility (31 October)

New `e2e/a11y.spec.ts` runs axe-core (WCAG 2.1 A and AA rules) on 21 pages across the public site and the parent, booking, therapist, supervisor and admin areas, and fails on serious or critical violations.

| ID | Severity | Confidence | Title | Status |
|---|---|---|---|---|
| F-14 | Medium | Confirmed | Text below WCAG AA contrast on 6 of the first 14 pages checked, mostly in the dark dashboards: faint labels at 3.9:1, accent text at 4.49:1, white text on terracotta buttons, chips and message bubbles at 3.5:1 (needs 4.5:1). A second pass found the same white-on-terracotta problem on the caseload and children pages. | **Fixed** (1d316bb): faint and accent colours adjusted just enough to pass on every dashboard surface; a separate fill colour for solid buttons under white text (unchanged on the light public site, deeper terracotta in the dashboards); all 21 pages now report no violations at any level |
| F-15 | Low | Confirmed | The home page's illustrative dashboard mock had a fake sidebar marked up as a real `<nav>`, announced to screen readers as navigation, and a scroll area unreachable by keyboard | **Fixed**: the mock is hidden from assistive tech; its heading and copy describe it |

Automated rules catch roughly a third of real barriers. A manual keyboard and screen-reader pass of sign-up, booking and the intake form is still worth doing before launch.

## Load test (31 October, staging)

`npm run test:load` (k6, `e2e/load/`). Synthetic users only; staging is the same Free-plan compute as production. Three and a half minutes, ramping to 20 anonymous visitors (therapist discovery, a therapist's open slots, the Learning Center) and 10 signed-in parents (own children, bookings, reports) at once.

| Measure | Result | Threshold |
|---|---|---|
| Requests | 24,551 at about 116 per second | |
| Response time, 95th percentile | 193 ms anonymous, 190 ms signed-in | under 1,500 ms: pass |
| Failed requests | 0.05% (13), all connection failures on the test machine's link (0 ms responses), no server errors | under 1%: pass |
| A parent receiving the other family's child | 0 times | 0: pass |

The database comfortably handles this load. It does not test the Next.js server on Vercel, Flutterwave or email; a pilot-sized launch is far below these numbers.

**Slow admin pages.** Timed against the production build on this machine: a public page 0.1 s, the parent dashboard 1.1 to 1.2 s, admin pages normally 1.4 to 2.4 s to first byte. About a third of admin loads took 12 to 14 s: the same 10-second connection stall, more likely on admin pages because the overview alone opens about 20 database queries at once. Nothing points to slow queries. Re-measure on production (Vercel request logs) before optimising; if it shows there too, folding the overview counts into a single database function would cut the connections.

## Completed 1 November

Payment edge cases (11 integration tests, plus the live webhook rejecting unsigned requests), keyboard-only checks (16), the CI workflow fix (F-16), the zod patch (F-17) and a read-only security fingerprint for comparing production with staging. Results, the full register and the verdict: `02-final-report.md`.
