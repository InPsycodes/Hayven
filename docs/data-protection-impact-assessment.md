# Data Protection Impact Assessment — Hayven — DRAFT

> **This is a first draft, not a completed DPIA.** It's written from direct knowledge of
> the actual system (built and security-audited over this project's history) so the
> factual sections are accurate as of the date below — but a DPIA is a governance
> instrument, and Sections 7 (risk ratings), 9 (sign-off), and the open items in Section
> 10 need a named Data Protection Officer or equivalent, and Nigerian legal counsel,
> before this is a real, adopted assessment rather than a draft. Use this as the starting
> structure and factual base, not as evidence of compliance on its own.

**Date of this draft:** 2026-09-19
**Last updated:** 2026-09-23 — see the "2026-09-23 update" notes throughout §2, §3, §6,
and §7. A second, larger pre-launch security audit closed between the original draft
and this update (21 findings across access control, payments, and booking — see §6.1),
and the pediatrician-referral flow gained a new data flow (a parent-facing email) not
yet reflected in the original draft. Nothing below was rewritten to sound more finished
than it is — items already marked open in the original draft (PITR, NDPC registration,
GA4 processing location, DPO/DSL naming) are still open, and are re-confirmed rather
than assumed stale.
**System assessed:** Hayven (paediatric-therapy marketplace web application and PWA)
**Author of this draft:** Written by Claude (Anthropic), from direct knowledge of the
codebase, its security audit history, and its data model — not a substitute for DPO or
legal review.

---

## 1. Why this assessment exists

Hayven processes children's health and developmental data, and therapists' professional
credential data, at meaningful scale for a Nigerian platform. Under the Nigeria Data
Protection Act 2023 (NDPA), processing that is likely to result in a high risk to the
rights of data subjects — which health data about children generally is — calls for a
documented impact assessment before (or alongside) that processing begins. This
document is that assessment: what's processed, why, what could go wrong, what already
guards against it, and what's still open.

---

## 2. Description of the processing

### 2.1 Nature

Hayven is a two-sided marketplace: parents/caregivers book and pay for paediatric
therapy sessions with independent, Hayven-verified therapists; therapists record
session notes and publish progress reports back to parents. A supervisor role can
oversee a group of therapists' clinical work. Admins operate verification, disputes,
refunds, and payouts.

### 2.2 Scope — data processed, by category

| Category | Examples | Data subject | Special-category? |
|---|---|---|---|
| Account data | Full name, email, phone, hashed password, role | All users | No |
| Child profile | First name, date of birth, presenting concern, diagnoses | Children (entered by parent) | **Yes — health data, and data about a child** |
| Clinical/session data | Session notes, goals, target behaviours, ABC observations, published reports | Children | **Yes — health data** |
| Confidential clinical notes | A subset of session observations never shown to the parent, visible only to the assigned therapist(s)/supervisor | Children | **Yes — health data** |
| Therapist professional data | Bio, qualifications, licence/credential documents, years of practice | Therapists | Professional/sensitive by nature of the document type (may include identity documents) |
| Booking & payment | Session bookings, amounts, Paystack transaction references | Parents, therapists | No (financial, not special-category, but sensitive) |
| Messages | Parent–therapist messages tied to a booking | Parents, therapists | Possibly — messages could incidentally contain health information |
| Technical/security logs | Sign-in timestamps, IP-adjacent access logs kept by infrastructure providers | All users | No |
| Product analytics | Page views, coarse actions (e.g. "booking started"), role | All users | No — explicitly excludes child data, session notes, report content (enforced by an allowlist, see §6.3) |
| Referral data *(added 2026-09-23 — pre-existing feature, not previously listed in this table)* | Child's name and age, a category-level reason for referral (e.g. "Speech / language"), free-text clinical context, a parent/guardian contact detail, and the referring clinician's own name/facility/contact | Children and prospective parents (referred by a third party — a pediatrician or other clinician — not self-submitted) | **Yes — health-adjacent (reason for referral, clinical context) and data about a child**, collected from someone other than the child's parent |

### 2.3 Context

- Children never hold their own accounts; a profile is created and controlled entirely
  by the registered parent, who provides consent for its collection.
- Access to a child's clinical data is scoped, at the database level (Postgres Row-Level
  Security), to: the child's own parent, the therapist(s) actively assigned to that
  child, that therapist's supervisor (where applicable), and admins (for safety/support).
  This is enforced by RLS policies and revoked-then-re-granted column ACLs, not only by
  what the application's UI happens to show.
- Confidential clinical notes are a distinct field, never included in the report a
  parent sees, and RLS-scoped separately from the parent-visible report.
- **Referral data is the one category in this table not initiated by the data subject's
  own family** *(2026-09-23)*: a pediatrician or other clinician submits it through a
  public, no-login form, before the parent has necessarily interacted with Hayven at
  all. The submitting clinician must explicitly confirm the parent/guardian is aware of
  and agrees to the referral before the form will submit (`src/lib/referrals/actions.ts`)
  — an attestation, not a verification, and documented as such (see §7, risk #12). A
  referral that never converts to an active family is automatically deleted after 90
  days (`purgeStaleReferrals`, `src/lib/referrals/cron.ts`); one that does convert
  (`status: care_started`) is excluded from that purge and its data lives on under the
  normal account/child data lifecycle instead.

### 2.4 Purposes

Account security and therapist verification; matching families with therapists and
managing bookings/scheduling/payments; enabling therapists to record sessions and
generate parent-facing reports; supervisor oversight of assigned therapists; safety
investigation and enforcement of platform terms; an audit trail of sensitive actions
(verification decisions, clinical record access, payout runs); legal/tax/professional
record-keeping.

---

## 3. Data flows

```
Parent registers child (consent given at entry) -> Postgres (Supabase, UK region)
                                                          |
                                                    RLS-scoped read/write
                                                          |
        Assigned therapist -----------------------  Child's clinical record
        (session notes, ABC data, goals)                 |
                                                    Report generated
                                                          |
                                          Confidential notes stripped out
                                                          |
                                                  Parent reads published report

Credential document (therapist) -> magic-byte + Cloudmersive virus scan (fail-closed)
                                          -> private Supabase Storage bucket, per-user path

Payment -> Paystack (amount + reference only; Hayven never receives full card data)
Booking/session/report events -> audit_log (service-role only, no user-facing grant)
Coarse product events (role, action, timing — never PII/clinical content) -> PostHog (EU), GA4

Pediatrician/clinician submits referral (public, no-login form;                 [added 2026-09-23]
  explicit "parent is aware and agrees" confirmation required) -> referrals table
                    |                                    |
        Admin notified (dashboard queue)      Parent emailed directly (if an email
                    |                          contact was given) -- a founder-signed
       Admin makes first contact               heads-up so the family isn't cold-
       (target: within 1 business day)         contacted; deliberately omits the
                    |                          clinical reason tags -- reassurance,
        Referral converts to a real            not a restated diagnosis category
        account & child (data now lives
        under the normal account/child
        lifecycle) -- OR --
        referral never converts -> auto-deleted 90 days after submission
```

### 3.1 Processors and sub-processors, and where they run

| Processor | Role | Location (as configured) |
|---|---|---|
| Supabase | Database, authentication, file storage | UK (eu-west-2 / London) |
| Vercel | Application hosting, serverless functions | Functions pinned to `lhr1` (London), colocated with the database |
| Paystack | Payment processing | Nigeria |
| PostHog | Product analytics | EU Cloud |
| Google Analytics | Site-traffic analytics | Google's global infrastructure — **not confirmed EU/UK-restricted; see open item in §10** |
| Resend | Transactional email | US by default (Resend stores account data, email metadata, and API logs in the US regardless of sending region, per their own documentation; an EU *sending* region exists on higher tiers but doesn't change where account data lives, and this codebase shows no evidence of that being configured). Email content sent through it includes notification titles/bodies, which can echo user-facing text but never raw clinical data (see `src/lib/email/send.ts` — the template only ever receives the same escaped title/body already shown in-app). |
| Cloudmersive | Virus scanning of uploaded credential documents | Likely US by default — the code calls `api.cloudmersive.com` (`src/lib/uploads/scan-file.ts:3`), Cloudmersive's default global endpoint, not an EU-specific one (they offer EU regions — Frankfurt, London — but reaching them requires an account-level region setting on a paid tier, which isn't visible from the code or this draft). The file itself is scanned, not stored, by this call. |
| Sentry | Error monitoring | **Confirmed EU (Frankfurt, Germany)** — the ingest hostname (`ingest.de.sentry.io`) is Sentry's dedicated EU data-residency region, not their US default. `sendDefaultPii: false` is also explicitly set on both client and server config, so Sentry does not receive PII by default regardless of region. |

Most of the system's core data (the database itself, and the servers that query it) is
UK-based, which is the most consequential fact for a transfer assessment — the
remaining processors above handle either no personal data, or a narrow, defined slice
of it (payment references, coarse analytics events, error stack traces).

---

## 4. Consultation

**Not yet done.** A real DPIA is a consultation exercise, not a solo document. Before
this is adopted:

- [ ] Consult whoever is or becomes the Data Protection Officer / privacy lead.
- [ ] Consult the Designated Safeguarding Lead once named (see `docs/safeguarding-procedure.md`,
      which has the same "not yet operative" status as this document, for the same reason).
- [ ] Consult Nigerian legal counsel on NDPA-specific expectations for a DPIA's form and
      the required content this draft may be missing.
- [ ] If Hayven works with a specific clinical/therapy advisory body, consult them on
      the clinical-data-handling sections specifically.

---

## 5. Necessity and proportionality

**Is each category of data actually necessary for the stated purpose?**

- Child profile and clinical data: necessary — the entire service is delivering and
  documenting paediatric therapy; there's no way to provide or evidence care without it.
- Confidential clinical notes, separate from the parent report: this is a *minimisation*
  measure, not an expansion — it exists specifically so sensitive clinical
  observations aren't over-shared with a parent by default, while still being
  recorded for continuity of care between therapists/supervisors.
- Therapist credential documents: necessary for the verification promise the platform
  makes to families; retained only as long as needed for that verification and any
  professional record-keeping obligation.
- Product analytics: deliberately minimised by an explicit allowlist (see §6.3) rather
  than free-form event capture — this was a specific design decision, not a default.
- Technical/security logs: necessary for account security and incident investigation;
  time-bounded (24 months, see §6.4).

**Could the same purpose be achieved with less data, or less identifiable data?** The
main place this question stays open is Google Analytics (§10) — the platform already
sends it only coarse, non-identifying events, but its processing location isn't
confirmed, which is a transfer question more than a minimisation one.

---

## 6. Existing safeguards

This section is the part of a DPIA usually thinnest at this stage for a young platform;
for Hayven it's already substantial, because a full security audit was completed and
acted on before this draft was written (`docs/production-audit-2026-09-03.md`, and a
follow-up full-platform diagnostic that closed every finding from it). What follows is
what's actually implemented today, not aspirational.

### 6.1 Access control

- Row-Level Security on every table holding personal or clinical data, scoping reads to
  the parent of a child, the therapist(s) assigned to that child, their supervisor, and
  admins — not just an application-layer check.
- Sensitive columns (`role`, `verification_status`, `confidential_note`,
  `reviewer_notes`, `debug_payload`) are column-ACL-revoked-and-regranted, not merely
  row-scoped, so a broader row grant can't accidentally expose a narrower sensitive field.
- MFA (TOTP) with step-up enforcement — a password-only session cannot complete a
  request once a factor is enrolled; this is checked centrally (`getSession`), not only
  at the login form.
- Signup role is server-validated against an allowlist (parent/therapist only) — there
  is no self-service path to an admin or supervisor account.
- As of 2026-09-19: adding a child now requires a separate, explicit checkbox — distinct
  from the blanket Privacy Policy/Terms acceptance at account signup — confirming the
  parent is that child's parent or legal guardian and consents to Hayven processing what
  they share, including health/developmental information (migration `0081`,
  `children.guardian_consent_at`; `src/components/parent/add-child-form.tsx`,
  `src/lib/parent/actions.ts`). This targets the two most concrete gaps a 2026-09-19
  compliance review raised: explicit/separate consent for sensitive data (NDPA s.30) and
  guardian-status confirmation (NDPA s.31), at the actual point a presenting concern is
  first typed in — before the later, already-solid granular intake-consent system
  (below) is ever reached. It does not by itself verify the claim (see §10).
- Separately, and pre-existing (not new this pass): once a child is added, the intake
  form's "Consent & sharing" section (migration `0077`, table `intake_consents`) already
  asks for granular, per-purpose, revocable consent — therapist access to the form and
  session records (required), sharing updates with named others, session photos/video,
  and de-identified data use for product improvement — each recorded with a timestamp
  and kept as history when changed, not overwritten (`src/lib/intake/schema.ts`,
  `CONSENT_COPY`). This compliance review's own review of the platform apparently missed
  this system, likely because it only had visibility into the static Privacy Policy/Terms
  text, not the in-app intake flow — worth surfacing to counsel directly rather than
  re-deriving requirements the app has already substantially met here.
- **2026-09-23 update — a second, independent pre-launch audit closed 21 further
  findings**, the large majority of them directly strengthening the access-control story
  in this section rather than adding new features. Not aspirational: every item below is
  a merged commit, and every fix has a dedicated regression test in
  `test/integration/` (92 tests total as of this update, run against a real
  throwaway Supabase project under real RLS, not mocked). Most relevant to this DPIA:
  - **Suspension now actually revokes database access, not just UI access**
    (AUTH-01): a suspended parent's or therapist's *existing, already-issued* session
    token previously kept working against RLS-protected tables even after suspension —
    now checked centrally and cut off immediately. This directly reduces the residual
    likelihood on risk #1 in §7 below (a compromised account that gets caught and
    suspended can no longer be used to keep reading a child's record).
  - **A supervisor could read more of a supervised therapist's own account row than
    intended** (RLS-01) — email, phone, and account status, not just the name needed
    for the team roster — closed at the database level.
  - **The report supervisor-approval gate was enforced by application code checking a
    second, unrelated RLS grant to work correctly** (RLS-02/RLS-04) — a fragile
    indirect dependency, not a hole exactly, but the kind of thing that silently breaks
    if the unrelated grant ever changes; now enforced directly.
  - **A therapist could edit or delete another clinician's diagnosis entry** on a
    shared case (RLS-03) — closed; diagnosis entries are now owner-restricted at the
    database level, matching the pattern already used for target behaviours/skills.
  - **`availability_slots` was publicly queryable for a therapist who shouldn't be
    publicly bookable** (unverified or suspended) (RLS-05) — closed.
  - **A parent could directly set `intake_forms.therapist_notified_at`** through a raw
    table update, bypassing the actual notification flow (RLS-06) — closed.
  - **A parent could directly delete their own child's row**, bypassing the account/
    clinical data retention and purge lifecycle described in §6.4 (RLS-07) — closed;
    this one is specifically relevant to this DPIA because an un-audited direct delete
    would have let a family route around the documented 6-year clinical retention
    policy without Hayven's own purge logic ever running or being recorded.
  - **A referral-status lookup could be used to brute-force-guess a reference code**
    against a *specific* targeted email, because the rate limit was keyed per-code
    rather than per-target (F1) — closed; relevant given referral data (see §2.2, §3
    above) includes a child's name and a parent's contact detail, reachable by that
    lookup once guessed.
  - Eight further findings closed the same audit pass concern payment/booking
    integrity rather than access control directly (duplicate charges, refund
    double-processing, a webhook-retry deadlock, a reconciliation sweep that silently
    stopped on the first bad record) — listed here for completeness since payment
    correctness is itself a data-integrity concern (see §6.6), not because they're
    access-control findings.

### 6.2 Data minimisation and integrity in transit/storage

- Credential document uploads are magic-byte sniffed (not trusted by declared file
  type), scanned by Cloudmersive with **fail-closed** behaviour (a scan failure blocks
  the upload rather than allowing it through), stored under generated (non-guessable)
  paths in a private bucket with per-user folder RLS.
- The `avatars` bucket (the one bucket that's public by design) is restricted at the
  storage-policy level to image MIME types and a size cap, closing a prior gap where the
  raw Storage API could bypass the application's own upload checks.
- Passwords are hashed by the authentication provider; Hayven never stores or displays
  one in plain text (and this document's author has never retrieved one, by standing
  operating rule).
- Webhook payloads (Paystack) are verified with an HMAC-SHA512 timing-safe signature
  check before any write.

### 6.3 Analytics minimisation

Product analytics (PostHog) and site analytics (GA4) both go through a single
allowlist function (`sanitizeProps`) rather than passing through arbitrary event
properties — role, step, count, amount, and enum-typed fields only. No child name, date
of birth, presenting concern, session note, or report content ever reaches either
analytics tool. Autocapture is off; the current page URL's query string is stripped
before send. Google Signals and ads personalisation are deliberately kept off on the
GA4 property.

### 6.4 Retention

Retention periods are published in the Privacy Policy (`/privacy`, Section 6) and
applied consistently: personal account data deleted within 30 days of a verified
deletion request; clinical records -- including a child's core identifying details,
not just session content -- kept up to 6 years after a child's last session (even
past account deletion, for continuity of care and professional record-keeping);
payment records kept 6 years on their own timeline, independent of the account and
clinical retention periods; security/audit logs 24 months.

Implemented: all four categories are now live -- personal-account-data purge (30
days, `src/lib/account/purge.ts`), the audit-log purge (24 months,
`src/lib/audit/cron.ts`), the clinical-record purge (6 years past a child's last
recorded session, anonymizing the child's identifying details alongside the
clinical content itself, `src/lib/clinical/purge.ts`), and the payment purge (6
years from the transaction date, independent of the clinical timeline,
`src/lib/payments/retention.ts`). Scheduled daily via `src/app/api/cron/retention`
(migration 0089) -- the clinical and payment windows don't need the 15-minute/
hourly cadence the other two crons run on.

**A fifth category, added 2026-09-23 (not previously listed here):** a referral that
never converts to an active family is deleted 90 days after submission
(`purgeStaleReferrals`, `src/lib/referrals/cron.ts`) — a shorter, judgment-call
window (not a legal minimum) specific to this category, since a referral's data only
ever existed to support a one-time outreach attempt. A referral that does convert is
excluded from this purge and its data moves under the normal account/child lifecycle
above instead.

### 6.5 Accountability

An `audit_log` table (service-role-only, no user-facing grant) records sensitive
administrative actions — verification decisions, clinical record access patterns,
payout runs, refund decisions — with actor, action, and metadata.

### 6.6 Money-flow correctness (indirect safeguard)

Not a privacy control on its face, but relevant to data integrity: a concurrency bug
that could have double-paid a therapist (found and fixed in the security audit, then
proven fixed by a real integration test that fires simultaneous requests against a live
database) is the kind of defect that, left open, would have produced an inaccurate
financial and audit record — a DPIA-relevant integrity concern, not just a money one.

### 6.7 Known, deliberately accepted residual items

- `script-src 'unsafe-inline'` in the Content Security Policy is a documented,
  bounded trade-off of the React Server Components rendering model, not an oversight —
  noted in `next.config.ts` and the original security audit.
- A vendor-agnostic meeting-link field (for virtual sessions) accepts any `https:` URL
  rather than an allowlist of known video providers — accepted given therapists are
  individually vetted before they can practise on the platform.

---

## 7. Risk identification and assessment

For each risk: what could happen, to whom, likelihood and severity **before** mitigation,
and the residual risk **after** the safeguards in §6. This draft's ratings are a
starting estimate from the system's builder, not a validated risk-assessment
methodology — recalibrate with whoever formally owns this document.

| # | Risk | Data subject | Likelihood (pre-mitigation) | Severity | Mitigation (§6 ref) | Residual risk |
|---|---|---|---|---|---|---|
| 1 | A parent or therapist account is compromised (credential stuffing, phishing), exposing a child's clinical record | Child | Medium | High | MFA + step-up (6.1), rate-limited login, **and (2026-09-23) suspension now actually revokes an existing session's RLS access (AUTH-01)** — a compromised account, once caught and suspended, can no longer be used at all, not just hidden from the UI | Low-Medium — MFA is opt-in, not mandatory; see §10. The suspension gap that previously limited this mitigation's effectiveness is now closed. |
| 2 | A therapist queries or is granted access to a child not assigned to them | Child | Low | High | RLS row-scoping (6.1); **(2026-09-23) further hardened by RLS-01/03/05/06/07** (supervisor over-exposure, cross-therapist diagnosis edits, unverified-therapist visibility, direct intake-consent tampering, direct child-row deletion — see 6.1) | Low — enforced at the database, not the UI, across a now materially larger regression-tested surface (92 integration tests) |
| 3 | A credential upload contains malware, or a spoofed file type | Therapist, platform | Low | Medium | Magic-byte + fail-closed AV scan (6.2) | Low |
| 4 | Analytics tooling captures identifying or clinical data by accident | Child, parent | Low (was structurally prevented, not just policy) | High if it occurred | Allowlist-based `sanitizeProps` (6.3) | Low |
| 5 | A therapist's payout is paid twice due to a concurrency bug, corrupting the financial/audit record | Therapist, platform | Was Medium; now fixed and integration-tested | Medium | Atomic claim + real concurrent-request test (6.6) | Low |
| 6 | A safeguarding concern about a child is raised but has no defined, working path to a responsible person | Child | **Currently High — no DSL is named yet** | **High** | Draft procedure exists (`safeguarding-procedure.md`) but is explicitly not operative | **High — open, see §10** |
| 7 | A data subject rights request (access/correction/deletion) has nowhere specific to go, or no defined SLA is met | Parent, therapist | Medium | Medium | A contact email exists; NDPA-timeframe commitment stated in the Privacy Policy | Medium — no DPO named yet to own this in practice |
| 8 | Cross-border transfers (confirmed: Resend and likely Cloudmersive process in the US by default; Google Analytics unconfirmed) have no documented NDPA transfer mechanism | All users (Resend: anyone who receives a notification email); Therapists (Cloudmersive: credential-scan requests) | Medium (process gap, not a technical one — the transfers themselves are already happening) | Medium | Most core data (the database, session notes, reports) stays UK-based; only email metadata and a credential file's scan request reach the US | Medium — open, see §10; now a documentation gap specifically, not an unknown one |
| 9 | A therapist's professional liability isn't clearly allocated, and a clinical incident becomes a platform liability question with no contract backing the "independent practitioner" framing | Child, therapist, platform | Medium | High | Terms of Service frames therapists as independent contractors | Medium-High — no standalone Therapist Agreement exists yet; flagged separately as the platform's highest non-technical legal gap |
| 10 | No verified backup/restore process exists, and a data-loss incident has no tested recovery path | All users | **Confirmed, not just suspected: Point-in-Time Recovery is disabled** (`pitr_enabled: false`, checked via the Supabase CLI against the production project) — the database can likely only be restored to whatever daily snapshot exists, not to a specific moment, and no restore has ever been tested | High if it occurred | None confirmed beyond whatever Supabase's plan tier includes by default (not itself verified) | **High — this is now a known gap, not an unknown one; see §10** |
| 11 | Hayven has not registered with the Nigeria Data Protection Commission (NDPC), and it's not confirmed whether the platform meets the "data controller/processor of major importance" threshold that would make registration mandatory (NDPA s.44) | Regulator relationship, all users indirectly | Not assessed — a compliance-process gap flagged externally on 2026-09-19, not something this codebase can determine on its own | Medium — a regulatory filing gap, not a data-safety one, but one the NDPC could act on directly | Not mitigated | Medium — open, see §10; needs a "major importance" determination from counsel before the registration question itself can even be answered |
| 12 | *(added 2026-09-23)* A child's name/age and a parent's contact detail are submitted by a third party (a referring pediatrician), before the family has necessarily interacted with Hayven or given consent directly | Child, prospective parent | Low-Medium — the referrer must explicitly confirm ("the parent/guardian is aware of and agrees to this referral") before the form submits, and submission is rate-limited per referrer contact | Medium — the data is health-adjacent (reason for referral) but limited in volume/fields, and the confirmation is an attestation, not a verified fact | The referrer confirmation checkbox (§2.3); a 90-day auto-purge if the referral never converts (§6.4); a parent-facing email sent promptly after submission so the family is proactively informed rather than only reached by a later admin phone call (added 2026-09-23, see §3) | Low-Medium — the core gap (an attestation isn't a verification) is structural to how any referral-based intake works and isn't fully closeable by code; the auto-purge and prompt parent notification bound how long an unconfirmed referral's data persists and how long the family stays unaware of it |

---

## 8. Measures to address the remaining risk

In priority order, matching the ratings in §7:

1. **Name a Designated Safeguarding Lead and make the safeguarding procedure operative**
   (risk #6). This is the single highest-severity open item in this whole assessment —
   higher than any technical gap — because it's about a child in active danger having
   no defined person to reach.
2. **Name a Data Protection Officer or equivalent privacy owner** (risk #7), even if
   that's a founder wearing the hat initially — a rights request needs a real owner, not
   just an inbox.
3. **Resolve the Google Analytics (and Resend, Cloudmersive, Sentry) processing-location
   question** and document the transfer basis for each (risk #8) — this was already
   flagged as a placeholder in the Privacy Policy's newly-added international-transfers
   section; this DPIA should be updated once that's answered, not answered independently
   of it.
4. **Draft and execute a standalone Therapist Agreement** (risk #9) — covers liability
   allocation, insurance expectations (if any), and confidentiality/data-processing
   terms specific to what a therapist actually does with a child's clinical data. A
   first draft exists (`docs/therapist-agreement.md`), itself not ready to use — see its
   own open items.
5. **Enable Point-in-Time Recovery and run an actual restore drill** (risk #10) —
   confirmed disabled on the production database as of this draft. "The provider
   probably backs it up" is not the same as a verified, tested recovery path, and this
   specific gap is no longer a guess.
6. **Consider making MFA mandatory, not opt-in**, for any account with access to
   clinical data (therapists, supervisors, admins) — currently available but not
   required (risk #1).
7. **Determine "data controller of major importance" status and register with the NDPC
   if required** (risk #11) — a threshold and filing question for counsel, not
   something derivable from the codebase.

---

## 9. Sign-off

| Role | Name | Date | Outcome |
|---|---|---|---|
| Author (this draft) | Claude (Anthropic) | 2026-09-19 | Draft complete, not adopted |
| Data Protection Officer / privacy owner | [FILL IN] | | |
| Legal counsel | [FILL IN] | | |
| Designated Safeguarding Lead | [FILL IN] | | |

**This DPIA is not in effect until at least the DPO/privacy-owner row above is
completed.** A DPIA that nobody with real authority has reviewed is a draft, not a
governance control.

---

## 10. Open items before this is a real, adopted DPIA

- [ ] Name a DPO/privacy owner and a Designated Safeguarding Lead — referenced
      throughout this document and blocking its own sign-off (§9).
- [ ] Confirm Google Analytics' processing location (the one processor still genuinely
      unknown — Sentry is confirmed EU/Germany, Resend and Cloudmersive are confirmed/
      likely US by default; see §3.1). Then get a lawyer to confirm the actual NDPA
      transfer mechanism relied on for each non-Nigeria, non-UK processor (Resend,
      Cloudmersive, and GA once its region is known) — the *locations* are now
      documented in this draft, but the *legal basis* for transferring to them still
      needs counsel, not more research. Feed the answer back into the Privacy Policy's
      international-transfers section, which currently has the same open question.
- [ ] **Enable Point-in-Time Recovery** on the production Supabase project (confirmed
      disabled via `supabase --experimental backups list --project-ref
      cfzbhibpwcerbxgawxqi`, which returned `pitr_enabled: false` and an empty backups
      list; **re-confirmed still disabled with the same live check on 2026-09-23**) —
      this is the one item in this whole document that's both fully confirmed *and* has
      an unambiguous next action, not a decision to make. Then run a real restore drill
      and record the result here.
- [ ] Decide whether MFA becomes mandatory for therapist/supervisor/admin roles (§8.6).
- [ ] Determine whether Hayven is a "data controller/processor of major importance"
      under the NDPA and, if so, register with the NDPC (§8.7, risk #11) — flagged by a
      2026-09-19 external compliance review; this document can record the gap but not
      resolve it.
- [x] ~~Explicit, separate consent for a child's sensitive data at the point it's first
      collected, and confirmation the person adding a child is their parent/guardian~~ —
      addressed 2026-09-19 for the "Add a child" form specifically (see §6.1); the
      platform's existing intake-form consent system already covered the fuller,
      granular version of this once a child exists. Still needs counsel's sign-off that
      the checkbox copy itself satisfies NDPA s.30/s.31, not just that a checkbox exists.
- [ ] Get an actual Data Processing Agreement (incorporating SCCs or an equivalent NDPA
      transfer mechanism) in place with each non-Nigeria processor (Supabase, Vercel,
      PostHog, Sentry, Resend, Cloudmersive, and Google once its region is known) — most
      of these vendors publish a standard, clickthrough DPA; confirming and executing
      each one is real (if usually fast) work, not just a documentation update to this
      file or the Privacy Policy.
- [ ] Draft the standalone Therapist Agreement (§8.4) — tracked as a separate document,
      not part of this DPIA, but this risk entry should be closed once it exists and is
      in use.
- [ ] Recalibrate the likelihood/severity ratings in §7 with whoever formally owns this
      document — they're a builder's first estimate, not a validated methodology.
- [ ] Set a review cadence (annually, and after any material change to what data is
      collected or how it's processed) and record it here once decided.
- [ ] *(added 2026-09-23)* Get counsel's view on whether the referrer's "parent is
      aware and agrees" confirmation checkbox (§2.3, risk #12) is a sufficient basis
      under NDPA for processing a child's data collected from a third party, or whether
      something closer to verification is expected — the same open question already
      flagged for the guardian-consent checkbox in the "Add a child" form (§10, the
      NDPA s.30/s.31 item above), now extended to this earlier point in the funnel
      where a family may not have interacted with Hayven at all yet.
