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

## Findings register (so far)

| ID | Severity | Confidence | Title | Status |
|---|---|---|---|---|
| F-01 | Low | Confirmed | `notifyParentReportPublished` and `cancelBookingsForDepartedTherapist` are internal helpers exported from `"use server"` files, so they are publicly callable endpoints. Not exploitable today: both need a live database client as the first argument, which a browser cannot send, so calls fail before doing anything. | Open: move them to a server-only module |
| F-02 | Low | Confirmed | `finalizeFromTransaction` (public, no rate limit) makes the server call Flutterwave's verify API for any numeric ID. It cannot fake a payment (Flutterwave re-verification, idempotent finalise) but can be used to make bulk outbound API calls. | Open: add a per-IP or per-session rate limit |
| F-03 | Informational | Confirmed | Unsubscribe tokens are HMAC-signed and compared in constant time, but never expire. This is common for email links, and the token only toggles email preferences. | Accept or add an expiry |
| F-04 | Low | Confirmed | Two pages carrying personal input or tokens are not on the service worker's never-cache list: `/signup/finish` (phone and terms) and `/unsubscribe?t=…` (personal token in the URL). They could be served from cache on a shared device. | Open: add both to `AUTHED_PATH` |
| F-05 | Informational | Confirmed | Anonymous visitors can see `is_booked` on availability slots, revealing when a listed therapist has sessions. No family data. | Accept, or expose free slots only |
| F-06 | Informational | Unconfirmed | Two requests to `/` minutes after a deploy lacked CSP, X-Frame-Options and HSTS. Nine later requests and ten other pages all had them. Likely a deployment switchover. | Recheck after future deploys |
| F-07 | Low (hardening) | Confirmed | Migration `0003` grants SELECT to the **anonymous** role and full CRUD to `authenticated` on every public table, so row-level security is the only barrier. It holds today (P3-01), but one future table created without RLS would be exposed instantly. | Open: revoke anon grants on non-public tables; add a CI check that every public table has RLS enabled |

**No Critical, High or Medium findings so far.** This rests on read-only, logged-out testing and static review only. Signed-in, cross-account and write-path testing has not been done yet and needs staging.

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

## Still to test

Signed-in browser journeys for all four roles (no Playwright suite yet); admin function-level checks through the server actions as a non-admin; booking and payment races in the browser; load and recovery; accessibility; PostHog and Sentry payload verification; the live production RLS policy set compared against migrations (needs read-only production DB access).
