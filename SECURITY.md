# Security policy & incident response plan

Hayven handles children's clinical and health data, family PII, and payment information. This document is both a
reporting channel for anyone who finds a security issue, and the runbook we follow if something goes wrong. It's
written to be usable *during* an incident, not just read once — keep it accurate as the stack changes.

## Reporting a vulnerability

If you've found a security issue in Hayven, please email **[security contact email — fill in]** directly rather
than opening a public GitHub issue. Include what you found, how to reproduce it, and its potential impact. We'll
acknowledge reports within 2 business days.

---

## Incident response plan

### 1. Severity levels

Classify first — it decides how fast and how wide the response needs to be.

| Level | Definition | Examples |
|---|---|---|
| **Critical** | Children's clinical/health data or payment data exposed, altered, or exfiltrated; unauthorized privilege escalation (e.g. a non-admin gaining admin access) | A leaked service-role key; an RLS gap letting one account read another child's records; a compromised admin account |
| **High** | Unauthorized access confirmed, but no evidence sensitive data was read/exported yet; an account compromise limited to one non-admin user | A phished therapist password used to log in; a bug allowing IDOR on a low-sensitivity resource |
| **Medium** | A real vulnerability found (by us or reported) with no evidence of exploitation | A dependency CVE; a misconfigured header; a rate-limiting gap |
| **Low** | Best-practice gap, no direct exploit path | Missing hardening, verbose error message, non-sensitive info leak |

### 2. How we'd detect an incident

These are the actual sources currently wired up — check all of them, not just the one that fired:

- **Sentry** (`sentry.io`) — error monitoring, alerts by email. Catches crashes and unhandled exceptions, not silent unauthorized access.
- **`audit_log` table** (Supabase) — records every sensitive admin/therapist action (verification decisions, assignment changes, report access, refunds, phrase-library edits, support resolutions). Query directly via the Supabase dashboard's SQL editor when investigating who did what and when. This table is append-only and column-locked from normal user access — it's the most trustworthy record of what happened.
- **In-app support requests** (`/admin/support`) — a user reporting something looking wrong is a real signal, not noise.
- **Supabase dashboard** — Auth logs (sign-ins, failed attempts), database logs, and the `rate_limit_attempts` table (a spike here is a live brute-force/abuse attempt in progress).
- **Vercel dashboard** — deployment logs, request logs, and unusual traffic patterns.
- **Cloudmersive scan rejections** — logged via `console.error` in `scanFileForViruses`; a burst of these is worth a look.

### 3. Immediate containment (do these first, in rough priority order)

The right subset depends on what's actually happening — don't do all of these reflexively, but know they're available:

- **Compromised credential (any kind)**: rotate it immediately.
  - Supabase keys (anon, service-role): Supabase dashboard → Project Settings → API → regenerate. Update `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars and redeploy. **The service-role key bypasses RLS entirely — treat its compromise as Critical automatically.**
  - Paystack keys: Paystack dashboard → Settings → API Keys & Webhooks → regenerate, update in Vercel.
  - Resend / Sentry / Cloudmersive keys: regenerate in each provider's dashboard, update in Vercel.
- **Compromised user account**: in the Supabase dashboard's table editor (or SQL editor), set `status = 'suspended'` on their row in `public.users`. `getSession()` and `signIn()` both check this and immediately block the account, in-progress sessions included — no admin UI for this yet, the dashboard update is the reliable path today. Force a password reset via Supabase Auth's user management while you're there.
- **Compromised admin account**: this is the highest-severity case. Rotate that admin's password immediately via the Supabase dashboard (not the app, in case the app itself is compromised). Review `audit_log` for every action taken under that account since the estimated compromise time.
- **An RLS/authorization bug actively being exploited**: the fastest containment is often to revoke the specific grant or drop the specific policy via the Supabase SQL editor — this can be done in seconds, faster than a code deploy. Follow up with a proper migration once contained.
- **A malicious deployment or supply-chain concern**: Vercel dashboard → Deployments → roll back to the last known-good deployment immediately; this takes seconds.

### 4. Investigation

Once contained, establish scope before doing anything else:

1. Pull the relevant window from `audit_log`, Supabase Auth logs, and Vercel request logs.
2. Identify exactly which accounts, children, or records were actually touched — not just what was theoretically reachable.
3. Check Sentry for any related errors in the same time window (a bug being exploited often throws errors along the way).
4. Document a timeline as you go: first suspicious activity, detection time, containment time. You'll need this for both the post-incident review and any regulatory notification.

### 5. Notification obligations

Hayven is subject to the **Nigeria Data Protection Act (NDPA)**. As a general principle (not legal advice — confirm
specifics with legal counsel, ideally the same counsel handling NDPC registration): a breach involving personal
data, especially children's health data, is likely to trigger a duty to notify the **NDPC** and, depending on
severity, the affected families directly, within a defined window of becoming aware of it. Don't wait until the
investigation is "finished" to start this conversation — begin it as soon as Critical or High severity is
confirmed.

Internal notification: **[who on the team needs to know immediately — fill in]**.

### 6. Recovery

- Confirm the root cause is actually fixed (a migration applied, a key rotated, a deployment rolled back) before considering the incident closed — re-verify live, the same way every fix in this codebase has been verified, not just by reasoning about the code.
- Restore any suspended accounts once safe.
- If data was altered (not just read), restore from backup — see the "Confirm Supabase backups / point-in-time recovery" item on the launch checklist; this plan assumes that's in place.

### 7. Post-incident review

Within a few days of closing out: write down what happened, how it was caught, how long containment took, and
the one or two concrete changes (a new RLS policy, a new alert, a process change) that would prevent a repeat.
Add real incidents (with dates) below as a running log — future-you will want the history.

---

## Incident log

*(Empty. Add an entry here after any real incident, however minor.)*
