# Counsel Briefing — Lawful Basis, Therapist Agreement Liability, and International Transfers

**Prepared:** 2026-09-23, for Hayven Health Limited (RC 9879135), registered at
No. 17, Aganga Williams, Ogba, Ikeja, Lagos State, Nigeria.
**Prepared by:** Claude (Anthropic), from direct knowledge of the system — not a
substitute for legal review, which is exactly what this document is requesting.
**Contact for questions on this brief:** Ademola Yusuf (Founder / DPO),
+2348122832137 / hayvenmind@gmail.com.

---

## How to use this document

This pulls together three open legal-review items that otherwise live scattered
across two longer documents (`docs/data-protection-impact-assessment.md` and
`docs/therapist-agreement.md`), so whoever reviews this can work from one focused
brief instead of the full drafts. Each part below states: the relevant facts (as
implemented, not aspirational), the specific question(s) that need an answer, and
where the answer should be written back into the source document once decided.

Nothing in this document is a legal conclusion. Every "Needs legal review" marker
is a genuine open question, not a rhetorical one — Hayven is not currently relying
on any of these as settled.

---

## Part A — Lawful basis for processing (NDPA)

**Source:** `docs/data-protection-impact-assessment.md` §3.

Hayven has a granular, revocable, timestamped **consent mechanism** already built
(the intake form's "Consent & sharing" section) and a **guardian-confirmation
checkbox** at the point a child is added. What it doesn't yet have is a confirmed
**lawful basis** under the NDPA for each processing activity — consent is one
possible basis, but leaning on it as a default for everything creates real
problems around necessity, withdrawal, and processing that needs to continue for
clinical-continuity or safeguarding reasons even after a nominal withdrawal.

| # | Processing activity | Data involved | Purpose | Proposed basis | Question for counsel |
|---|---|---|---|---|---|
| 1 | Parent account creation | Identity/contact | Enable account use | Contract | Confirm — lowest risk of this list |
| 2 | Child profile creation | Health/developmental data | Enable therapy delivery | Unconfirmed | Is this contract (services the parent signed up for), a special condition for sensitive personal data, or does it need both? |
| 3 | Session notes, goals, reports | Health data | Care documentation and continuity | Unconfirmed | Same special-category question as #2 |
| 4 | Confidential clinical notes | Health data | Clinical record-keeping distinct from the parent-visible report | Unconfirmed | Same as #2, plus: does the minimisation argument (this data is deliberately withheld from the parent) affect the basis? |
| 5 | Therapist credential verification | Licence/credential documents | Professional/marketplace vetting | Unconfirmed | Legal obligation, legitimate purpose, or contract — which fits how the NDPA treats marketplace vetting of a service provider? |
| 6 | Booking and payment | Transaction data | Deliver and charge for the service | Contract + likely a legal-obligation basis for the payment/tax record | Confirm the second basis and its scope |
| 7 | Security/audit logs | Technical identifiers, actor/action metadata | Security, incident investigation, accountability | Legitimate interest or legal obligation | Confirm which, and whether it varies by log type |
| 8 | Marketing communications | Contact data | Marketing (if/when sent) | Consent | Lowest risk — confirm this stays separate from transactional/service email |
| 9 | Product analytics | Allowlisted, non-identifying usage events only | Product improvement | Unconfirmed | Consent, legitimate interest, or another basis, given the data is already minimised and non-identifying by design |
| 10 | Referral intake | A child's name/age, clinical-adjacent context, and a parent's contact detail — collected from a third-party clinician, not the parent | Facilitate the referral and first contact | Unconfirmed — **flagged as the most legally sensitive item in this table** | The referring clinician attests the parent is aware and agrees, but that attestation is not the parent's own consent. Does this processing need a distinct basis (e.g. legitimate interest in facilitating a professional referral, time-limited until the parent's own consent is obtained) rather than being treated as consent-by-proxy? See Part A's own note below. |

**Specific concern on row 10:** this is the one data flow in the system collected
from someone other than the data subject's own family, before that family has
necessarily interacted with Hayven at all. A referral that never converts to a
real account is auto-deleted after 90 days; a converted one moves under the
normal account lifecycle. Counsel's view is needed on whether the current
attestation-based approach is a sufficient legal basis for this narrow,
time-bounded window, or whether it needs to be restructured (e.g. explicitly
framed as legitimate interest with a defined retention limit, rather than implied
consent).

**Once answered:** update the "Proposed lawful basis" column in
`docs/data-protection-impact-assessment.md` §3, and close the corresponding open
item in §15.

---

## Part B — Therapist Agreement: liability, insurance, and indemnification

**Source:** `docs/therapist-agreement.md` §7 (full draft agreement attached
alongside this brief).

**Context already settled and implemented in the product** (not proposals —
these are live): therapists are independent contractors; commission is a fixed
20% to Hayven / 80% to the therapist; earnings clear 72 hours after a session
and pay out weekly; a bank account is required before any payout; the existing
Terms of Service already states Hayven "does not warrant... clinical outcomes of
any therapist" and disclaims liability "for the acts or omissions of an
independent therapist." What's missing is a standalone agreement that mirrors
that liability position from the therapist's own side, with real terms instead
of a platform-wide consumer-facing disclaimer.

**Update 2026-10-09:** Hayven has since decided the business terms. Insurance is
required at verification, the non-circumvention window is 12 months, both notice
periods are 30 days, and the liability cap is 12 months' commission. The questions
below now ask for the minimum cover, the clause wording and enforceability, not the
decisions themselves. See `docs/counsel-and-adviser-pack.md` C10–C15.

**Three open questions, verbatim from the draft:**

1. **Professional liability insurance.** Should the Platform require therapists
   to carry their own professional indemnity/liability insurance as a condition
   of verification? If so, what minimum coverage amount? (Common in comparable
   therapy marketplaces; Hayven's current Terms of Service doesn't address this
   at all.)
2. **Indemnification clause.** Should the therapist indemnify the Platform
   against claims arising from their own clinical conduct — the standard
   marketplace pattern — and if so, what should the clause actually say under
   Nigerian contract law? (This needs counsel to draft correctly, not template
   language adapted from a different jurisdiction.)
3. **Platform's own liability cap to the therapist.** Should there be a cap on
   Hayven's liability to a therapist (e.g. for a payout error), and what process
   should a therapist use to raise a payment dispute?

**A fourth question the document itself flags as potentially reshaping the whole
draft, not just filling a blank:** is the "independent contractor" classification
actually defensible under Nigerian labour law, given the platform's actual degree
of control — a fixed commission rate, a fixed payout schedule, a verification
gate, and defined conduct standards? A written label doesn't override how a
relationship functions in practice if it's ever examined by a labour tribunal.

**Also open, lower stakes:** the non-circumvention window after a
platform-facilitated match (draft suggests ~12 months as a common default, not
decided), the termination notice period (draft suggests ~30 days, not decided),
and whether Lagos State courts are the right forum for a therapist agreement
specifically, given therapists may practise from anywhere in Nigeria.

**Once answered:** update `docs/therapist-agreement.md` §1, §4, §6, §7, and §10
directly — every `[FILL IN]` in that document maps to one of these questions.

---

## Part C — International transfer register

**Source:** `docs/data-protection-impact-assessment.md` §6.

Most of Hayven's core data (the database itself, and the application servers
that query it) is UK-based (Supabase eu-west-2 / London; Vercel functions
pinned to lhr1). The remaining processors each handle a narrower, defined slice
of data. None of them currently has a confirmed executed DPA or a confirmed NDPA
transfer mechanism — the table below is a location inventory, not yet a
compliance record.

| # | Vendor | Data received | Location | Priority |
|---|---|---|---|---|
| 1 | Supabase | Clinical, account, full dataset | UK (eu-west-2) | Medium — core data, but UK is the more favourable jurisdiction of this list |
| 2 | Vercel | Application/request data | UK (lhr1) | Medium — same reasoning as Supabase |
| 3 | Paystack | Transaction references, amounts | Nigeria | Low — domestic, likely no international-transfer question at all |
| 4 | PostHog | Allowlisted coarse events only | EU Cloud | Low — minimised data, EU jurisdiction |
| 5 | Sentry | Error/stack-trace metadata; PII explicitly disabled in config | Confirmed EU (Frankfurt, Germany) | Medium |
| 6 | Resend | Email content/metadata, recipient address | **US by default**, confirmed via vendor documentation | **High** |
| 7 | Cloudmersive | The uploaded credential document itself (scanned, not stored, per-call) | **Likely US by default** (global endpoint; EU regions exist only on a paid tier not currently configured) | **High** |
| 8 | Google Analytics | Allowlisted coarse events, if configured | **Unconfirmed** — the one processor whose region isn't known at all | **High**, and also blocks knowing which transfer mechanism even applies |

**What counsel needs to answer, per vendor:** (a) does a standard,
already-published clickthrough DPA from that vendor suffice, or does something
more need to be negotiated; (b) what NDPA transfer mechanism is actually being
relied on for the US-bound vendors (Resend, Cloudmersive) specifically — this is
the highest-priority question in this section, since those transfers are already
happening today, not hypothetical; (c) for Google Analytics, once its processing
region is confirmed (a task for Hayven, not counsel), the same mechanism question
applies.

**Once answered:** update the "DPA executed?" and "Transfer mechanism" columns in
`docs/data-protection-impact-assessment.md` §6, and feed the answer into the
Privacy Policy's international-transfers section, which currently has the same
open placeholder.

---

## Consolidated question list (for a scoping call or engagement letter)

1. What NDPA lawful basis applies to each row in Part A's table, especially
   child-profile/clinical data (rows 2–4) and referral intake (row 10)?
2. Is Hayven's "independent contractor" framing for therapists defensible given
   its actual degree of control over them?
3. Should therapists be required to carry professional liability insurance, and
   at what minimum coverage?
4. Draft the specific indemnification clause for the Therapist Agreement under
   Nigerian contract law.
5. Should there be a cap on Hayven's liability to a therapist, and what's the
   payment-dispute process?
6. What NDPA transfer mechanism applies to Resend and Cloudmersive (both
   US-bound today), and what should Hayven's DPA with each cover?
7. Once Google Analytics' processing region is confirmed, what transfer
   mechanism applies there too?

---

## Related documents to share alongside this brief

- `docs/data-protection-impact-assessment.md` — full DPIA (this brief pulls from
  §3 and §6)
- `docs/therapist-agreement.md` — full draft agreement (this brief pulls from §7)
- `docs/mutual-nda-template.md` — near-final NDA template, lower priority, still
  worth a once-over
- `docs/safeguarding-procedure.md` and `docs/breach-response-runbook.md` — not
  part of this brief's scope (lawful basis/liability/transfers), but both are
  separately flagged as needing legal review of their own (mandatory-reporting
  duties, the relevant Nigerian child-protection authority, NDPC breach-filing
  mechanics)
