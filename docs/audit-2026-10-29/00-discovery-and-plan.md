# Hayven audit, 29 October 2026: discovery and plan

Phase 0 of the end-to-end audit (brief section 18). Read-only so far: nothing in the code, database or deployment has been changed for this audit. Commit at time of discovery: `90de9e0`.

## 1. Repository and deployed architecture

| Layer | What is actually there |
|---|---|
| App | Next.js **16.4.3**, App Router. 92 pages, 7 API routes, 29 server-action modules, a proxy (middleware) that gates `/parent`, `/therapist`, `/admin`, `/supervisor`. |
| Hosting | Vercel, production at hayven.com.ng. No staging deployment found. |
| Database and auth | Supabase **production** project `cfzb…`. 112 migrations, 58 tables. Row-level security is enabled on all 58 in the migration files (live state not yet verified). |
| Privileged access | **73 files** use the service-role client, which bypasses row-level security. Each one's own authorisation check is the only protection, so each must be reviewed. |
| Storage | Buckets `credentials` (private) and `avatars` (public). |
| Payments | Flutterwave v3, test mode. Webhook at `/api/webhooks/flutterwave` with a secret hash. |
| Email | Resend. |
| Analytics | PostHog, EU, proxied through `/ingest`. Autocapture and session replay off; query strings stripped. |
| Errors | Sentry (EU). |
| PWA | Serwist service worker. Sensitive routes are set to network-only; the default cache covers the rest. 218 precached files. |
| Jobs | Vercel cron endpoints `/api/cron/notifications`, `/api/cron/reconciliation`, `/api/cron/retention`; GitHub Actions `notifications-cron.yml` and `storage-backup.yml`. |
| Backups | Supabase point-in-time recovery **off** (confirmed 19 September). A storage backup workflow exists; a database restore has never been rehearsed against a real copy. |

## 2. Feature inventory against the brief

| Brief's feature name | In the code | Status |
|---|---|---|
| Authentication and account management | `/login`, `/signup` (+ steps), `/forgot-password`, `/reset-password`, Google sign-in for parents, change password, account deletion requests | Implemented |
| Parent onboarding and child profiles | `/parent`, `/parent/children` | Implemented |
| Therapist discovery, profiles, pricing | `/search`, `/therapists/[id]` | Implemented |
| Booking, cancellations, notifications | `/book/[therapistId]/*`, `/parent/sessions`, `/therapist/schedule` | Implemented |
| Eight-section intake | `/parent/children/[childId]/intake`, `/therapist/children/[childId]/intake` | Implemented |
| **Early Signals** and paediatrician referral | `/needs-assessment` (matching quiz), `/pediatricians/refer`, `/pediatricians/status` | Implemented under different names |
| **Development Journal**, goals, trends | Therapist sessions, goals, programme, progress reports with trend charts; parent reports page | Implemented under different names |
| Home Practice | `src/lib/home-practice`, parent card, therapist panel | Implemented |
| **Care Circle** (shared goals, supervisor review) | Supervisor report approval exists. No shared-goal circle or caregiver invitations. | **Partly implemented** (supervisor review only) |
| **Parent Academy** | Learning Center `/learn`, plus courses and therapist modules | Implemented under a different name |
| Therapist dashboards, cases, reports, notes | `/therapist/*` | Implemented |
| Supervisor oversight | `/supervisor/*` (therapists with a supervisor flag) | Implemented |
| Admin, user management, verification | `/admin/*` (22 pages) | Implemented |
| Payments, invoices | Flutterwave checkout, refunds, payouts; `/parent/billing` | Implemented. Payouts blocked by Flutterwave IP whitelisting. |
| Messaging, notifications, emails | `/parent/messages`, `/therapist/messages`, in-app bell, push, email | Implemented |
| Safeguarding | `/therapist/safeguarding`, `/admin/safeguarding` | Implemented |
| Data export, deletion, retention | Deletion requests and automatic purge; retention cron | Deletion and retention implemented. **Self-service data export not found.** |

## 3. Roles and sensitive data

**Roles:** `parent`, `therapist`, `admin` (a database enum). Supervisor is a therapist with `is_supervisor`. Safeguarding leads are a subset of admins. A signup trigger only allows parent or therapist; there is no in-app way to become admin.

**Most sensitive data, highest first:** clinical notes and the clinical report body (`reports.therapist_body`); child diagnoses; intake developmental histories and consents; safeguarding concerns; session data (goals, behaviours, skills); therapist credential documents (`credentials` bucket); messages; payment and bank details; contact details.

## 4. Existing tests and CI

| Suite | State |
|---|---|
| Unit tests (Vitest) | 93 tests in 16 files. **Passing** today. |
| Integration tests | 22 files covering row-level security, suspended accounts, refunds, webhooks, supervisor exposure and more. **Cannot run:** they are hard-wired to a throwaway Supabase project (`hayven_load_test`) that **no longer exists** (DNS lookup fails). |
| Browser end-to-end tests | **None.** No Playwright suite in the repo. |
| Load tests (k6) | **None found.** |
| CI | GitHub Actions: dependency audit (high and above), build, type check, lint, unit tests. The integration job is skipped because its secrets point at the deleted project. |
| Dependency audit | Next.js, Sentry and DOMPurify advisories fixed today. 20 remaining, all in development or build tooling, none shipped to the live site. |

Earlier audits to build on: `docs/production-audit-2026-09-03.md`, `docs/full-platform-diagnostic-2026-09-16.md`, the external audit of 8 October (AUD-01 to AUD-11), and today's payment testing (five bugs fixed).

## 5. Test environments and access needed

| Need | Why | Status |
|---|---|---|
| **A staging Supabase project** with all 112 migrations applied | The brief forbids destructive, cross-user and load tests on production, and the integration suite needs a disposable project | **Missing.** Blocks most of phases 3, 4, 5, 8 and 11. |
| A staging Vercel deployment (preview) pointed at staging | Browser journeys, PWA and security-header testing without touching real families | Missing |
| Read-only database access (a connection string for a read-only role) | Verify live row-level security policies, grants, functions and storage policies directly, which the API cannot show | Missing |
| Synthetic accounts: 2 parents, 2 therapists, 1 supervisor, 1 admin, each with synthetic children | Cross-user isolation matrix | Can be created once staging exists |
| Flutterwave test keys | Payment journeys | Available |
| Resend test domain or sandbox | Email failures and duplicates | Unknown |

## 6. Highest-risk areas, investigated first

1. **Live row-level security and grants.** Migration `0003` grants `select` to the anonymous role and full access to signed-in users on every public table, so row-level security policies are the only barrier. Every table must be probed as anonymous, as parent A against parent B, and as an unassigned therapist.
2. **The 73 service-role call sites.** Each bypasses row-level security; a missing ownership check in any server action is a direct cross-family leak.
3. **Clinical report access**: the PDF route and the `therapist_body` column.
4. **The `credentials` bucket**, and whether any path or public URL reaches it.
5. **Safeguarding tables**: service-role only by design; confirm no client grant.
6. **Payments**: forged webhooks, replay, and booking and refund state consistency.
7. **The PWA cache**: whether an authenticated page or another account's data can be served from cache on a shared phone.
8. **Admin power**: two admins, no two-factor login, full refund and suspend powers.
9. **Backups**: point-in-time recovery off and no rehearsed restore.

## 7. Blockers

- No staging environment, and the integration test project is gone.
- No read-only database role for policy inspection.
- No browser test suite or load test scripts yet (both can be built).
- Legal questions (NDPA lawful basis, retention periods, data transfers) need counsel or a data protection officer. Code review cannot settle them.

## 8. Phased plan

| Phase | Work | Where | Evidence and deliverable |
|---|---|---|---|
| 1 | Finish the route and feature inventory (deliverable B) and the data-flow diagram | Code only | `01-inventory.md` |
| 2 | Baseline: lint, types, unit tests, build, secret scan, migration state | Local plus read-only production checks | `02-baseline.md` |
| 3 | Safe production probes: anonymous access to every table and bucket, security headers, cache headers, open redirects | **Production, read-only, unauthenticated** | First security findings |
| 4 | Code review of all 73 service-role sites, the PDF route, webhooks and cron endpoints | Code only | Findings register (deliverable D) |
| 5 | Stand up staging, restore the integration suite, add a Playwright suite for the four role journeys | Staging | Test matrix (C), authorisation matrix (E) |
| 6 | Privacy and data-flow review: PostHog, Sentry, emails, logs, retention | Code plus staging | Deliverable F |
| 7 | Load and recovery tests, including a restore drill | Staging only | Deliverable G |
| 8 | Fix confirmed issues with regression tests; deployment and rollback plan; launch checklist | Code plus staging | Deliverables H, I, J and a final status |

Phases 1 to 4 can start now without new access. Phases 5 to 8 need the staging environment.
