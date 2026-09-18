# Data Protection Impact Assessment — Hayven — DRAFT

> **This is a first draft, not a completed DPIA.** It's written from direct knowledge of
> the actual system (built and security-audited over this project's history) so the
> factual sections are accurate as of the date below — but a DPIA is a governance
> instrument, and Sections 7 (risk ratings), 9 (sign-off), and the open items in Section
> 10 need a named Data Protection Officer or equivalent, and Nigerian legal counsel,
> before this is a real, adopted assessment rather than a draft. Use this as the starting
> structure and factual base, not as evidence of compliance on its own.

**Date of this draft:** 2026-09-19
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
```

### 3.1 Processors and sub-processors, and where they run

| Processor | Role | Location (as configured) |
|---|---|---|
| Supabase | Database, authentication, file storage | UK (eu-west-2 / London) |
| Vercel | Application hosting, serverless functions | Functions pinned to `lhr1` (London), colocated with the database |
| Paystack | Payment processing | Nigeria |
| PostHog | Product analytics | EU Cloud |
| Google Analytics | Site-traffic analytics | Google's global infrastructure — **not confirmed EU/UK-restricted; see open item in §10** |
| Resend | Transactional email | **Region not confirmed in this draft; see §10** |
| Cloudmersive | Virus scanning of uploaded credential documents | **Region not confirmed in this draft; see §10** |
| Sentry | Error monitoring | `sendDefaultPii: false` explicitly set on both client and server — Sentry does not receive PII by default. **Region not confirmed; see §10** |

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
deletion request; clinical records kept up to 6 years after a child's last session (even
past account deletion, for continuity of care and professional record-keeping);
payment records 6 years; security/audit logs 24 months.

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
| 1 | A parent or therapist account is compromised (credential stuffing, phishing), exposing a child's clinical record | Child | Medium | High | MFA + step-up (6.1), rate-limited login | Low-Medium — MFA is opt-in, not mandatory; see §10 |
| 2 | A therapist queries or is granted access to a child not assigned to them | Child | Low | High | RLS row-scoping (6.1) | Low — enforced at the database, not the UI |
| 3 | A credential upload contains malware, or a spoofed file type | Therapist, platform | Low | Medium | Magic-byte + fail-closed AV scan (6.2) | Low |
| 4 | Analytics tooling captures identifying or clinical data by accident | Child, parent | Low (was structurally prevented, not just policy) | High if it occurred | Allowlist-based `sanitizeProps` (6.3) | Low |
| 5 | A therapist's payout is paid twice due to a concurrency bug, corrupting the financial/audit record | Therapist, platform | Was Medium; now fixed and integration-tested | Medium | Atomic claim + real concurrent-request test (6.6) | Low |
| 6 | A safeguarding concern about a child is raised but has no defined, working path to a responsible person | Child | **Currently High — no DSL is named yet** | **High** | Draft procedure exists (`safeguarding-procedure.md`) but is explicitly not operative | **High — open, see §10** |
| 7 | A data subject rights request (access/correction/deletion) has nowhere specific to go, or no defined SLA is met | Parent, therapist | Medium | Medium | A contact email exists; NDPA-timeframe commitment stated in the Privacy Policy | Medium — no DPO named yet to own this in practice |
| 8 | A cross-border transfer (e.g. via Google Analytics) has no documented legal basis | All users | Medium (process gap, not a technical one) | Medium | Most core data stays UK-based; GA's basis is undocumented | Medium — open, see §10 |
| 9 | A therapist's professional liability isn't clearly allocated, and a clinical incident becomes a platform liability question with no contract backing the "independent practitioner" framing | Child, therapist, platform | Medium | High | Terms of Service frames therapists as independent contractors | Medium-High — no standalone Therapist Agreement exists yet; flagged separately as the platform's highest non-technical legal gap |
| 10 | No verified backup/restore process exists, and a data-loss incident has no tested recovery path | All users | Unknown — not verified in this draft | High if it occurred | Supabase provides managed backups by default | Unknown — needs verification, see §10 |

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
   terms specific to what a therapist actually does with a child's clinical data.
5. **Verify Supabase's backup/restore configuration and run an actual restore drill**
   (risk #10) — "the provider probably backs it up" is not the same as a verified,
   tested recovery path.
6. **Consider making MFA mandatory, not opt-in**, for any account with access to
   clinical data (therapists, supervisors, admins) — currently available but not
   required (risk #1).

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
- [ ] Confirm processing location and documented transfer basis for Google Analytics,
      Resend, Cloudmersive, and Sentry (§3.1) — feed the answer back into the Privacy
      Policy's international-transfers section, which currently has the same open
      question.
- [ ] Verify Supabase's backup configuration and run a real restore drill; record the
      result here (risk #10).
- [ ] Decide whether MFA becomes mandatory for therapist/supervisor/admin roles (§8.6).
- [ ] Draft the standalone Therapist Agreement (§8.4) — tracked as a separate document,
      not part of this DPIA, but this risk entry should be closed once it exists and is
      in use.
- [ ] Recalibrate the likelihood/severity ratings in §7 with whoever formally owns this
      document — they're a builder's first estimate, not a validated methodology.
- [ ] Set a review cadence (annually, and after any material change to what data is
      collected or how it's processed) and record it here once decided.
