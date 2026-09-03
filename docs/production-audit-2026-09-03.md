# Hayven — Production Readiness Audit

**Date:** 2026-09-03
**Scope:** Full codebase — every route, server action, API route, RLS migration, storage
policy, auth path, money flow, upload path, and the client surface.
**Method:** Static review of `src/` and `supabase/migrations/`. No live pen-test run
(no staging with real data + real Paystack keys was available to the auditor).
**Reviewer stance:** principal engineer + senior QA.

---

## 1. Executive summary

Hayven is a **well-engineered application with a genuinely strong security posture.**
The codebase shows a clear history of security review — migrations `0016→0021`, `0018`,
`0029`, `0030`, `0031`, `0040`, `0049`, `0055` each close a specific, named
vulnerability class (self-verification, self-promotion to admin, booking status
forgery, cross-child clinical access, rate-limit RPC exposure). The patterns that
matter are applied consistently:

- **Session** is a single choke point (`getSession`) that re-checks MFA/AAL and
  `status = 'suspended'` on every request.
- **Privileged writes** go through the service-role client with explicit
  application-level ownership checks; RLS is the backstop, not the only layer.
- **RLS** column-scopes the dangerous fields (`role`, `status`,
  `verification_status`, `confidential_note`, `reviewer_notes`, `debug_payload`)
  via revoked-then-re-granted column ACLs, not just row policies.
- **Uploads** are magic-byte sniffed, virus-scanned fail-closed, stored under
  generated names in a private bucket.
- **Concurrency** on the booking/payment path is handled with atomic
  conditional updates, not read-then-write.

No finding in this audit is a remote unauthenticated compromise, a clinical/child
data breach, or a trivial privilege escalation. The open issues are concentrated
in **money reconciliation edge cases** and a few **unused-but-unsafe RLS surfaces**.

### Launch recommendation

| Scenario | Verdict |
| --- | --- |
| **Closed pilot** (hand-picked families + therapists, team watching dashboards) | **GO**, after fixing **H-1** and **M-3** (both small). |
| **Open public launch** (self-serve signup, marketing traffic, real payouts running unattended) | **NO-GO** until H-1, M-2, M-3, M-4, M-5, M-6 are fixed, an integration test covers booking→payment→payout→refund, and the Part B operational items (legal/NDPR, safeguarding lead, licence-verification process, uptime alerting, backup drill) are in place. |

---

## 2. Findings

Severity: **HIGH** = money loss or data exposure reachable in normal operation;
**MEDIUM** = requires an edge case, insider, or crafted request, bounded blast
radius; **LOW** = hygiene, defense-in-depth, or UX regression.

---

### H-1 — `runPayouts()` can pay a therapist twice (no concurrency guard)

**Severity:** HIGH
**File:** `src/lib/payouts/actions.ts:38-106`

`runPayouts` reads all `therapist_earnings` where `status = 'pending'` and
`payout_id is null`, groups them, creates a `payouts` row, then does:

```ts
await admin.from("therapist_earnings").update({ payout_id: payout.id }).in("id", group.ids);
```

The claim on the earnings is **not atomic** — the update has no
`.is("payout_id", null)` filter, and there is no lock, advisory lock, or
"process one run at a time" guard anywhere.

**Steps to reproduce**
1. Have ≥1 therapist with cleared earnings ≥ `MIN_PAYOUT_NAIRA`.
2. As admin, double-click "Run payouts", or open `/admin/payouts` in two tabs and
   click Run in both within ~1s, or let the action retry on a slow response.
3. Both invocations read the same pending earnings, both create a `payouts` row,
   both call Paystack `initiateTransfer`.

**Impact:** the therapist receives the payout **twice**; real money leaves the
Hayven Paystack balance. `earning_count` and the ledger are also corrupted.

**Fix**
- Serialize the run: take a Postgres advisory lock
  (`select pg_try_advisory_xact_lock(<const>)`) at the top of the action via an
  RPC, bail if not acquired.
- **And** make the claim atomic: `update therapist_earnings set payout_id = $1
  where id = any($2) and payout_id is null returning id`, then build the transfer
  from the rows actually returned (not `group.ids`).
- Add a client-side `disabled` on the button during the transition (mitigation
  only — the server fix is the real one).

---

### M-2 — Refunds outside the dispute flow never reverse the therapist's earning

**Severity:** MEDIUM
**Files:** `src/lib/admin/actions.ts:239-285` (`processRefund`),
`src/lib/admin/actions.ts:187-230` (`markPaymentRefunded`),
`src/lib/booking/webhook-refund.ts:12-50` (`finalizeRefund`)

Only the dispute path calls `releaseBookingEarnings(admin, bookingId, refunded=true)`
to reverse a therapist's `therapist_earnings` row. The **Refunds queue**
(`processRefund`, `markPaymentRefunded`) and the `refund.processed` webhook do
**not** touch `therapist_earnings` at all.

**Steps to reproduce**
1. A session completes → `recordSessionEarnings` credits the therapist
   (`status = 'pending'` or later `'paid'`).
2. Admin later decides to refund it from `/admin/refunds` (not a dispute) —
   clicks "Process refund".
3. Parent is refunded via Paystack. The therapist's earning row is untouched and
   still pays out.

**Impact:** Hayven silently absorbs the full session amount (refunded the parent
*and* paid the therapist), with no warning to the admin and no ledger entry
showing the loss. Same gap for a late-cancel where `recordRetainedEarning` already
ran and the admin then issues a larger goodwill refund.

**Fix**
- In `finalizeRefund` on `refund.processed`, call
  `releaseBookingEarnings(admin, booking_id, refunded=true)`.
- In `processRefund`, before firing the refund, check for
  `therapist_earnings` on the booking and either block with a message
  ("this session has a therapist earning — resolve via a dispute so it's
  reversed") or reverse it explicitly and show the admin the net effect.

---

### M-3 — Parent can INSERT arbitrary bookings directly (unused, unsafe RLS policy)

**Severity:** MEDIUM
**File:** `supabase/migrations/0018_*.sql` (policy `"parent creates own bookings"`)
**App path that makes it unused:** `src/lib/booking/actions.ts:114` inserts via the
**service-role** client, not the user's client.

`0018` correctly dropped the parent UPDATE policy on `bookings` and re-scoped the
INSERT policy to `status = 'pending_payment'` — but the INSERT policy still exists
and only checks `parent_id = auth.uid() and status = 'pending_payment'`. It does
**not** validate `child_id`, `therapist_id`, `availability_slot_id`, or
`session_type`.

**Steps to reproduce** (authenticated parent, browser console, anon key + own session)
```js
await supabase.from('bookings').insert({
  parent_id: MY_ID,
  child_id: SOME_OTHER_PARENTS_CHILD_ID,   // not validated
  therapist_id: ANY_THERAPIST_PROFILE_ID,
  availability_slot_id: ANY_SLOT_ID,        // never held
  status: 'pending_payment',
  session_type: 'virtual',
});
```

**Impact**
- Bypasses `createPendingBooking` entirely: no slot hold, no rate limit, no
  `MAX_CONCURRENT_HOLDS`, no "slot in the future" check, no `expires_at`.
- A script can insert unlimited `pending_payment` rows that never expire
  (`expires_at` null) → therapist schedule/caseload clutter, DB bloat.
- If the attacker then pays (`initiatePaystackPayment` only checks
  `booking.parent_id === session.userId`), `finalizeBookingPayment` writes a
  `therapist_child_assignments` row for `(their therapist_id, another parent's
  child_id)` — polluting a therapist's caseload and attaching a therapist to a
  child whose real parent never chose them.

**Fix:** drop the `"parent creates own bookings"` policy entirely (same call
`0018`/`0030` made for the update policies — the app never uses it). If a
belt-and-suspenders INSERT policy is wanted, add
`and exists (select 1 from children c where c.id = child_id and c.parent_id = auth.uid())`
and a slot-validity check.

---

### M-4 — `avatars` storage bucket accepts arbitrary direct uploads

**Severity:** MEDIUM
**File:** `supabase/migrations/0008_storage_fix.sql:41-57`

The `avatars` bucket is `public: true`. Its INSERT/UPDATE policies check only
`bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text` —
**no MIME restriction, no size limit** at the policy level. The app's own upload
path (`updateTherapistPhoto`, `saveProfileStep`) does magic-byte + virus scan +
2.5 MB check, but the **raw Storage API bypasses all of it**.

**Steps to reproduce** (any authenticated user, including a parent)
```js
await supabase.storage.from('avatars').upload(
  `${MY_ID}/x.html`,
  new Blob(['<script>…</script>'], { type: 'text/html' })
);
// → public URL: https://<project>.supabase.co/storage/v1/object/public/avatars/<MY_ID>/x.html
```

**Impact**
- Arbitrary file hosting on a `*.supabase.co` domain the app's CSP `img-src` and
  `next/image` `remotePatterns` both trust — usable for phishing pages, tracking
  content, or malware distribution under a "Hayven infrastructure" host.
- No script execution *inside* the Hayven origin (different domain), so not app
  XSS — but reputationally and abuse-wise it's real.
- Unbounded storage cost.

**Fix**
- Set the `avatars` bucket's `file_size_limit` and `allowed_mime_types`
  (`image/png`, `image/jpeg`) in `storage.buckets` / the dashboard.
- Restrict the INSERT policy's `name` to an image extension, or (cleaner) move
  avatar uploads to a signed-upload-URL issued by a server action after the same
  checks the credential path uses, and drop the direct-insert policy.
- Consider whether parents need avatar-upload capability at all — if not, scope
  the policy to therapist-role accounts.

---

### M-5 — `markNoShow` abuse surface

**Severity:** MEDIUM
**File:** `src/lib/booking/actions.ts:659-729`

Two issues:

**(a) Converts a `completed` session to `no_show`.** The status guard accepts
`["completed", "confirmed"]`. A therapist can retroactively flip a session that
already completed (and already credited them via `recordSessionEarnings`) to
`no_show` — which sets the parent's `refund_amount` to 0 and records a *second*
earning via `recordNoShowEarning`. The `onConflict: "booking_id,source"` on the
`retained_cancellation` source means the second earning is a different `source`
than `session`, so it is **not** deduped against the completed-session earning.
Net: therapist potentially credited twice, parent's refund zeroed, and the record
now shows the family as the no-show.

**(b) No rate/volume guard.** A verified therapist can mark *every* past session
`no_show` (any time after `end_time`). Each one: parent gets ₦0 back, therapist
gets their full share of the retained charge. It is audit-logged but nothing
surfaces or alerts on an abnormal no-show rate.

**Steps to reproduce (a)**
1. Session completes; `recordSessionEarnings` writes a `session` earning.
2. Therapist opens "Recently finished", clicks "Mark no-show" on the same booking.
3. `markNoShow` succeeds (status was `completed`), writes a `retained_cancellation`
   earning, sets `refund_amount = 0`.

**Fix**
- (a) Restrict the guard to `status = 'confirmed'` only (a `completed` session was
  attended by definition). If a "we completed it then realised nobody came" path
  is genuinely needed, route it through support, not a self-serve button, and
  reverse the `session` earning first.
- (b) Add a soft cap + Sentry anomaly signal on no-shows per therapist per
  window, mirroring `checkRateLimit`'s alert-on-trip pattern; add a
  no-show-rate column to the admin therapist view.

---

### M-6 — `transfer.reversed` after `transfer.success` is ignored

**Severity:** MEDIUM (rare in practice)
**File:** `src/lib/payouts/webhook.ts:21`

`finalizeTransfer` returns early when `payout.status === 'paid'`. If Paystack
sends `transfer.reversed` *after* a successful transfer (bank bounce, recall),
the handler no-ops: the payout stays `paid`, the `therapist_earnings` stay
`paid`, and Hayven's ledger overstates what was actually delivered while the money
is back in the balance.

**Fix:** handle `transfer.reversed` even when `status = 'paid'` — set the payout
to `reversed`, move its earnings back to `pending` (so the next run retries) or to
a `reversed` terminal state with an admin notification.

---

### L-7 — Webhook handlers lack idempotency / replay protection

**Severity:** LOW
**Files:** `src/app/api/webhooks/paystack/route.ts`, `src/lib/booking/webhook-refund.ts`

- `finalizeRefund` on `refund.processed` has no dedup guard — Paystack retries
  webhooks, so the parent gets a duplicate "Refund complete" notification and the
  writes re-run.
- No event-id store / timestamp check anywhere — a captured valid
  `(body, x-paystack-signature)` pair replays forever. Blast radius is limited by
  the mostly-idempotent handlers (charge finalize, transfer finalize), but
  `finalizeRefund` and any future non-idempotent handler are exposed.
- `JSON.parse(rawBody)` is unguarded — a malformed body throws → 500 (Paystack
  retries; noisy but not harmful).

**Fix:** persist processed Paystack event IDs (`event.id` / `data.id`) in a small
table with a unique constraint; short-circuit on replay. Wrap `JSON.parse`.

---

### L-8 — Rate-limit fail-open is silent

**Severity:** LOW
**File:** `src/lib/rate-limit/check.ts:40-55`

`checkRateLimit` returns `true` (allow) on **any** infrastructure error, and only
emits a Sentry event when a bucket **trips**. If `public.check_rate_limit` is
dropped, renamed, or the DB is unreachable, every rate limit in the app
(login brute-force, signup spam, payment-init, message flood, credential-upload
quota) silently disappears with **no alert**.

**Fix:** emit a distinct Sentry event on the fail-open branch (`tags: { anomaly:
"rate_limit_unavailable" }`), rate-limited itself so it doesn't storm.

---

### L-9 — `?next=` post-login redirect is dead

**Severity:** LOW (UX)
**Files:** `src/proxy.ts:38`, `src/app/(steps)/**/page.tsx` (set `?next=`),
`src/components/auth/login-form.tsx` (never reads it)

`proxy.ts` and the step pages redirect unauthenticated users to
`/login?next=<path>`, but `LoginForm` always calls `roleHomePath(role)` and
ignores `next`. A parent pushed off `/book/x/payment` to log in lands on
`/parent`, losing their booking context.

**Fix:** have `LoginForm`/`verifyMfaLogin` honour a validated relative `next`
(reuse the `startsWith("/") && !startsWith("//")` guard already in
`auth/confirm/route.ts`).

---

### L-10 — Price is re-read at pay time with no re-confirmation

**Severity:** LOW
**Files:** `src/lib/payments/actions.ts:67,78`, `src/lib/booking/actions.ts` (finalize)

`initiatePaystackPayment` charges `therapist_profiles.price_per_session` *as read
at payment time*, not a price captured on the booking. If the therapist raises
their price between the parent creating the 15-minute hold and paying, the parent
is charged the higher amount silently. `finalizeBookingPayment` records whatever
Paystack attests without comparing it to an expected value.

**Fix:** snapshot `price_naira` onto the `bookings` row at `createPendingBooking`;
charge and verify against that; if it differs at pay time, re-confirm with the
parent.

---

### L-11 — No minimum notice on new / rescheduled bookings

**Severity:** LOW
**Files:** `src/lib/booking/actions.ts` (`createPendingBooking`, `rescheduleBooking`)

New bookings and reschedule-*to* only check "slot start is in the future".
Cancellation and reschedule-*away* require 24 h. A parent can book or move into a
slot that starts in 2 minutes — before the day-before reminder, the 75-minute
reminder, and (for virtual) the 10-minute meeting-link window can fire.

**Fix:** enforce a `MIN_BOOKING_NOTICE_MS` (e.g. 2 h) on both paths, or make it a
per-therapist setting.

---

### L-12 — Dispute window check skipped when timestamps are absent

**Severity:** LOW
**File:** `src/lib/disputes/actions.ts:43-47`

`reference = slot?.end_time ?? booking.cancelled_at ?? null`. When both are null
the 7-day check is bypassed and a dispute can be opened with no time bound.

**Fix:** fall back to `booking.created_at` (or reject with "contact support" when
no timestamp is available).

---

### L-13 — `resolveDispute` refund amount has no upper bound

**Severity:** LOW
**File:** `src/lib/disputes/actions.ts:96-102`

`refund = Math.round(refundAmount ?? 0)` with only a `> 0` check. An admin
mistype writes an arbitrary `bookings.refund_amount`. Paystack rejects a refund
larger than the original transaction, so real money is bounded — but the
displayed "refund owed" and any downstream reporting is not.

**Fix:** clamp to the original `payments.amount` for that booking; show the
computed policy amount as the default.

---

### L-14 — Action enum params not runtime-validated

**Severity:** LOW
**Files:** `src/lib/admin/actions.ts` (`reviewVerificationRequestReal`,
`setUserAccountStatus`), several others

Union-typed string params (`VerificationDecision`, `"active" | "suspended"`,
`DisputeResolution`) are trusted at runtime. A crafted server-action call with an
out-of-range value usually hits a DB enum error, but
`reviewVerificationRequestReal` would spread `verificationCopy[<invalid>]`
(`undefined`) into `createNotification`, producing a notification with
`title: undefined`.

**Fix:** validate against an explicit allowlist at the top of each action.

---

### L-15 — `resetUserAccountPassword`: no admin-on-admin protection, no target notice

**Severity:** LOW (insider risk)
**File:** `src/lib/admin/actions.ts:556-581`

Unlike `setUserAccountStatus` and `setUserSupervisorFlag` (which block
`userId === session.userId`), the password-reset action has no self/peer guard. An
admin can set **any** account's password — including another admin's — to a value
they know, then log in as them. The target is not notified. It is audit-logged.

**Fix:** block `userId === session.userId`; block target `role = 'admin'` unless a
second admin approves; email the target "your password was reset by an
administrator". Longer term, prefer issuing a Supabase recovery link over setting
a known password.

---

### L-16 — Minor input / defense-in-depth gaps

- `sendRealMessage` (`src/lib/messages/actions.ts`) doesn't do an app-level
  "am I a party to this booking" check before the insert — RLS (`0002`
  `"booking participants send messages"`) holds, so this is defense-in-depth
  only. `messages.content` has **no length cap** (multi-MB body possible).
- `setMeetingLink` accepts any `https:` URL — a verified therapist could paste a
  phishing link that the parent trusts because it's in-app. Vendor-agnostic by
  design; acceptable given therapists are vetted, but worth an allowlist of
  known meeting hosts.
- `auth/confirm/route.ts` passes the attacker-controlled `type` query param into
  `verifyOtp` (cast to a union). Not exploitable (a mismatched type just fails
  verification) but should be validated.
- `openDispute` inserts via the user client relying on an RLS policy on
  `booking_disputes` (migration `0072`) — **verify that policy re-checks
  `parent_id = auth.uid()` and booking ownership**; the action's own check is
  good but the RLS backstop should match.

---

## 3. Areas reviewed and found solid

| Area | Notes |
| --- | --- |
| **Session / auth** | `getSession` re-validates MFA AAL + `suspended` on every call; `cache()` is per-request only. Login rate-limited by email; MFA step-up enforced in the session layer, not just the form. |
| **Role escalation** | Signup role is whitelisted in `handle_new_user` (`0029`); `users` self-update is column-scoped to `full_name/phone` (`0049`); `therapist_profiles` update excludes `verification_status` (`0021`). No in-app path writes `role = 'admin'`. |
| **Clinical / child data isolation** | `children`, `therapy_sessions`, `reports`, `session_notes`, `progress_goals` RLS is row-scoped to parent-of-child / assigned-therapist, with `confidential_note`, `reviewer_notes`, `debug_payload` column-revoked. Multiple prior hardening passes (`0011/0012/0014/0017/0022/0031/0040`). Parent sees only `published_at is not null` reports. |
| **File upload (credentials)** | Magic-byte sniff (PDF/JPG/PNG only, not `File.type`), Cloudmersive scan **fail-closed**, generated storage path (no traversal), private bucket, per-user folder RLS, size-checked, rate-limited. Model implementation. |
| **Payment initiation** | Atomic lock on `bookings.payment_initiated_at` in the update `WHERE` clause prevents concurrent Paystack transactions; lock released on genuine failure; rate-limited; webhook signature is HMAC-SHA512 timing-safe; `charge.success` finalize is an idempotent conditional update. |
| **Booking slot holds** | Atomic `update … where is_booked = false`; rollback on booking-insert failure; opportunistic expiry cleanup. |
| **Report publish / review submit / dispute resolve** | All idempotent via conditional updates or upsert. |
| **Admin surface** | Every admin action re-checks `session.role === 'admin'`; `admin/layout.tsx` gates the whole route group server-side in addition to middleware; self-suspend and self-supervisor-flag blocked. |
| **Notification emails** | `renderNotificationEmail` explicitly `escapeHtml`s title + body — stored-HTML-injection into other users' inboxes is closed. Resend SDK params (no raw SMTP header injection). |
| **CSP / headers** | Strict `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, HSTS preload, `X-Content-Type-Options`, `Permissions-Policy`. `script-src 'unsafe-inline'` is a **known, documented** RSC trade-off (see `next.config.ts` comment) — real but bounded; nonce plumbing is the eventual fix. |
| **Rate limiting** | Backed by a Postgres function; RPC execute grant revoked from `anon/authenticated` (`0055`) so it can't be called directly; applied to login, signup, MFA, booking hold, payment init, messages, credential upload, support requests. (Fail-open visibility is L-8.) |
| **Cron endpoint** | `Authorization: Bearer` with a 64-hex secret, timing-safe compare; no cookies so CSRF-irrelevant. |
| **PWA / icon / serwist routes** | `icons/[size]` whitelists sizes before use; no user input in file paths. |

---

## 4. Concurrency review (explicit)

| Operation | Guard | Verdict |
| --- | --- | --- |
| Two parents booking the same slot | atomic `update … where is_booked = false` | **safe** |
| Double-click / two tabs on "Pay" | atomic lock on `payment_initiated_at` in update `WHERE` | **safe** |
| Webhook + redirect both finalizing a payment | idempotent conditional update (`… where status = 'pending_payment'`) | **safe** |
| Concurrent cancel + cancel | conditional update `… where status = <observed>` | **safe** |
| Concurrent reschedule | atomic new-slot hold, conditional booking move, rollback | **safe** |
| Publish report twice | conditional update `… where status != 'published'` | **safe** |
| Submit review twice | `upsert` on `(parent_id, therapist_id)` | **safe** |
| Resolve dispute twice | conditional update `… where status = 'open'` | **safe** |
| Auto-complete past bookings on read | conditional update `… where status = 'confirmed'`, idempotent earning upsert | **safe** |
| **Two `runPayouts()` in flight** | **none** | **UNSAFE — H-1** |
| `MAX_CONCURRENT_HOLDS` check | read-then-insert (TOCTOU) | soft cap, low impact — a few extra holds possible |

---

## 5. Performance

Covered in depth in the prior perf thread; summary:

- Lighthouse: `/` = 99, `/search` = 83 → **92** after the fixes below.
- **Fixed:** discovery data now cached (`unstable_cache`, 120 s + tag invalidation)
  — the app previously did **zero** caching and re-queried on every page view;
  `/search` CLS fixed (Suspense skeleton + reserved height); Vercel functions
  pinned to `lhr1`, colocated with the London Supabase (was defaulting to
  `iad1`, every SSR query crossing the Atlantic); `/ingest/*` excluded from
  middleware so analytics beacons don't cost a Supabase Auth round-trip.
- **Load test:** clean to ~100 concurrent users, database idle (≤3 % CPU) at
  every level tested. Stress degradation past that was dominated by the test
  runner's own socket limit, not the app; Vercel serverless concurrency is the
  real ceiling and is a plan-tier question, not a code defect.
- **Watch:** `searchDiscoveryTherapists` still fetches every verified therapist
  and filters in JS. Fine at pilot scale (bounded by therapist count); push the
  filters into the query before the marketplace grows past ~100–150 therapists.
- **Write-on-read:** `releaseExpiredHolds` and `autoCompletePastBookings` perform
  writes during GET renders. Deliberate (avoids a cron); idempotent; acceptable,
  but note it means page loads are not side-effect-free.

---

## 6. Accessibility

- `A1 #8` did a static pass: `lang`, skip link, landmarks, reduced-motion global
  catch-all, focus rings on interactive controls, `aria-label`s on
  placeholder-only inputs.
- **Not done:** a real-browser axe-core run and a contrast audit of the warm-dark
  `.care-theme` portal. No blocker found statically, but this needs a live sweep
  before claiming WCAG AA. (The load-test agent's report references an axe-core
  run in a worktree — fold those results in.)

---

## 7. Testing gaps

- 27 unit tests: report generation, refund math, commission split, unsubscribe
  token. Good coverage of the pure logic.
- **No integration/e2e test** of the highest-risk flow: create hold → pay →
  webhook finalize → complete → earning → payout → refund/dispute. Given the
  money-reconciliation findings (H-1, M-2, M-5, M-6), this is the single most
  valuable test to add before an open launch.
- No test that RLS actually denies a cross-tenant read/write (the migrations are
  reviewed but not asserted).

---

## 8. Prioritised action list

**Before the closed pilot**
1. **H-1** — serialize `runPayouts` + atomic earning claim.
2. **M-3** — drop the `"parent creates own bookings"` RLS policy.
3. **L-8** — Sentry signal on rate-limit fail-open (one line, high value).

**Within the first weeks of the pilot**
4. **M-2** — reverse therapist earnings on non-dispute refunds.
5. **M-5** — restrict `markNoShow` to `confirmed`; add no-show anomaly signal.
6. **M-4** — lock down the `avatars` bucket (size + MIME limits).
7. **L-15** — admin-on-admin password-reset guard + target notification.

**Before an open public launch**
8. **M-6** — handle `transfer.reversed` after success.
9. **L-7** — Paystack event-ID dedup table.
10. Integration test of the full money flow (§7).
11. L-9, L-10, L-11, L-13 — the booking/payment UX and bounds fixes.
12. Part B operational items (legal/NDPR, safeguarding lead, licence-verification
    process, uptime alerting, backup/restore drill).

---

## 9. Bottom line

The engineering is sound and the security fundamentals are better than most
apps at this stage. The blocking issues for a **closed pilot** are two small,
well-defined fixes (H-1, M-3). The blocking issues for an **open launch** are a
handful of money-reconciliation fixes plus one integration test plus the
non-code operational readiness that only the team can do.

**Closed pilot: GO after H-1 + M-3. Open launch: NO-GO until §8 items 4–12.**
