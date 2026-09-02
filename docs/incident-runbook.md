# Incident runbook — DRAFT

> First draft generated for the pilot. Fill in the `[FILL IN]` placeholders
> (names, phone numbers, escalation contacts, status-page URL) before
> relying on it. Keep it short enough to actually use at 2am.

## Roles

| Role | Person | Contact | Backup |
|---|---|---|---|
| Incident lead (decides, coordinates) | [FILL IN] | [FILL IN] | [FILL IN] |
| Infra / deploys | [FILL IN] | [FILL IN] | [FILL IN] |
| Comms (users, status page) | [FILL IN] | [FILL IN] | [FILL IN] |
| Data-protection (NDPR) contact | [FILL IN] | [FILL IN] | — |

## Severity

- **SEV1** — users can't sign in, book, pay, or view a child's data; or a
  suspected data exposure. Wake people up.
- **SEV2** — a major feature is broken but there's a workaround (e.g.
  reports won't generate, notifications not sending). Handle within hours.
- **SEV3** — cosmetic / low-impact. Normal backlog.

## First 10 minutes (any SEV1)

1. **Declare it.** One person is incident lead. Post in [FILL IN: channel].
2. **Confirm scope.** Is it everyone or one account? One region? Started when?
3. **Check the dependency dashboards** (links below) — is this us or a provider?
4. **Mitigate before you diagnose.** Roll back first, root-cause after (see Rollback).
5. **Start a timeline** — a running doc: what you saw, what you did, timestamps.
6. **Comms** — if it's user-visible and lasts >15 min, post to [FILL IN: status page]
   and hold. Don't speculate on cause publicly.

## Dependency dashboards

- Vercel (hosting): https://vercel.com/[FILL IN: team]/[FILL IN: project] · status: https://www.vercel-status.com
- Supabase (DB, auth, storage): https://supabase.com/dashboard/project/[FILL IN: ref] · status: https://status.supabase.com
- Paystack (payments): https://dashboard.paystack.com · status: https://status.paystack.com
- Resend (email): https://resend.com/emails · status: https://resend-status.com
- Cloudmersive (credential virus scan): https://account.cloudmersive.com
- GitHub Actions (cron backstop): repo → Actions

## Common incidents

### Site down / widespread 5xx
1. Vercel → Deployments — is the latest build green? Did a deploy just land?
2. If a bad deploy: **Vercel → Deployments → previous good one → Promote to Production** (instant rollback, no rebuild).
3. If build is fine but pages 500: check Vercel → Logs (Functions) for the stack trace. Common: a missing env var after a settings change (redeploy is required for env changes to apply).
4. Supabase up? (see dashboard) — a DB outage surfaces as 500s on every dynamic page.

### Can't sign in / sessions dropping
1. Supabase → status, and Dashboard → Authentication → is the service healthy?
2. Check `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel haven't changed.
3. `src/proxy.ts` (middleware) refreshes the session cookie — if a recent change touched it or `src/lib/supabase/middleware.ts`, roll back.
4. Cookie `secure` flag is set only in production (`src/lib/supabase/server.ts`) — irrelevant on https, would break local http only.

### Payments failing / bookings stuck on `pending_payment`
1. Paystack → status, and Dashboard → is the account in good standing (not restricted)?
2. Paystack → Settings → API Keys & Webhooks — is the webhook URL still
   `https://[FILL IN: domain]/api/webhooks/paystack` and enabled? Check
   recent webhook deliveries for failures.
3. Even if the webhook is down, the confirmation page calls
   `finalizeFromReference` (a direct Paystack `/verify`) as a fallback — a
   parent who paid but sees "finalizing…" should resolve on refresh.
4. A booking held >15 min with no payment auto-releases (the slot frees on
   the next read of that therapist's availability, or via the cron).
5. Manual fix for a genuinely-paid-but-stuck booking: confirm the charge in
   Paystack, then an admin can... [FILL IN: is there an admin action, or is
   it a direct DB update? document the exact step].

### Reports won't generate
- `generateReport` is pure/deterministic; a throw is logged
  (`"report generation threw"`) in Vercel Function logs with the sessionId.
- Usually a malformed `structured_data` on a session entry. Get the
  sessionId from the log, inspect `session_skill_entries.structured_data`.

### Notifications / reminders not sending
1. pg_cron: Supabase SQL editor —
   `select * from cron.job_run_details order by start_time desc limit 5;`
   (should be `succeeded` every 15 min) and
   `select status_code, error_msg, created from net._http_response order by created desc limit 5;`
   (should be `200`).
2. `401` on `net._http_response` → the Vault `cron_secret` and Vercel
   `CRON_SECRET` have diverged. Re-align (see [FILL IN: link to secret doc]).
3. If pg_cron is wedged, the GitHub Actions "Notifications cron (backstop)"
   still runs hourly — trigger it manually (Actions → Run workflow) to
   catch up.
4. Emails specifically: Resend → Emails for bounces/failures; Resend →
   Domains — is the sending domain still Verified?

### Suspected data exposure / RLS bug
**Treat as SEV1 immediately.**
1. Contain: if a specific endpoint/policy is leaking, you can
   `revoke`/tighten the RLS policy directly in the Supabase SQL editor
   without a deploy. Do that first.
2. Assess: what data, whose, how many records, for how long. Preserve logs.
3. Notify the data-protection contact. NDPR breach notification has a
   **72-hour** clock from awareness — start it now, don't wait for full
   root cause.
4. Only then, root-cause and write the permanent fix as a migration.

## Rollback

- **App code:** Vercel → Deployments → pick the last known-good → **Promote
  to Production**. Instant, no rebuild. This is almost always the right
  first move.
- **Env vars:** revert the value in Vercel → Settings → Environment
  Variables, then **redeploy** (env changes don't apply to a running
  deployment).
- **Database migrations:** there is no automatic down-migration. Most
  migrations here are additive (new column/table/policy) and safe to leave.
  A bad policy change: re-apply the previous policy definition by hand from
  git history (`supabase/migrations/`). A destructive change (dropped
  column): restore from Supabase **Point-in-Time Recovery** — confirm PITR
  is enabled on the current plan *before* you need it.

## Comms templates

**Status post (short, no cause):**
> We're aware of an issue affecting [sign-in / booking / payments] and are
> working on it. Updates here every 30 minutes.

**Resolved:**
> This is resolved as of [time]. [One sentence on impact.] If you're still
> seeing a problem, contact [FILL IN: support address].

**Affected-user email (only if data or money was involved):**
> [FILL IN — draft with the data-protection contact; do not send an ad-hoc
> version.]

## After the incident

Within 3 working days, a written review: timeline, what broke, why it
wasn't caught, the one or two concrete changes that would have prevented or
shortened it. No blame. File it in [FILL IN].
