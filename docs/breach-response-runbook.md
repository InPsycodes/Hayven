# Personal Data Breach Response Runbook — Hayven — DRAFT

**Responsible entity:** Hayven Health Limited (RC 9879135), registered at No. 17,
Aganga Williams, Ogba, Ikeja, Lagos State, Nigeria.

> **This is a first draft and is NOT operative.** It's written from direct knowledge
> of the actual system (its access controls, monitoring, and audit trail) so the
> technical sections are accurate, but a real breach-response procedure needs (a) a
> tabletop run-through so the roles below know what they'd actually do, and (b)
> Nigerian legal counsel's confirmation of the exact NDPC notification mechanics —
> the portal process, required fields, and any sector-specific wrinkles for
> health-adjacent data — before anyone relies on this during a real incident. Use
> this as a starting structure, not a tested plan. See `docs/data-protection-impact-
> assessment.md` §13 (Breach response) and risk #13, which this document exists to
> close.

**Draft date:** 2026-09-23

---

## 1. Purpose and scope

To make sure that when a personal data breach happens — or might have happened —
there's a known person to reach, a fast way to decide how serious it is, a clock
that starts on time, and a record of what was done. This covers any breach touching
data Hayven controls or processes: account data, a child's clinical or health
data, therapist credentials, payment data, or referral data (see the DPIA's data
categories, §2.2).

A **personal data breach** here means a breach of security leading to the
accidental or unlawful destruction, loss, alteration, unauthorised disclosure of,
or access to, personal data. That's broader than "someone hacked the database" —
it includes a report emailed to the wrong parent, a therapist reading a child's
record they weren't assigned to, or a lost/stolen device with cached data on it.

---

## 2. Roles

| Role | Person | Contact | Responsibility in a breach |
|---|---|---|---|
| Data Protection Officer (DPO) | Ademola Yusuf (Founder) | +2348122832137 / hayvenmind@gmail.com | Decides whether NDPC notification and/or data-subject notification is required; owns the NDPC submission; signs off the final record |
| Designated Safeguarding Lead (DSL) | Ademola Yusuf (Founder) | +2348122832137 / hayvenmind@gmail.com | Leads if the breach involves or endangers a specific child (overlaps with the safeguarding procedure — the same underlying concern, a different reporting obligation) |
| Deputy Safeguarding Lead | Yusuf Omotoyosi | +2348022884563 / motoyo25@gmail.com | Acts if the DPO/DSL is unreachable; same authority to trigger containment and escalation |
| Technical investigator | Ademola Yusuf (Founder) | — | Has the actual system access (Supabase, Vercel, Sentry, admin panel) to contain and investigate |

**Same single-point-of-failure noted in the DPIA and the safeguarding procedure
applies here too, more acutely**: the DPO, DSL, and the only person with technical
system access are currently the same one person. The Deputy Safeguarding Lead
gives *decision* cover (someone else can decide to escalate), but not *technical*
cover — Yusuf Omotoyosi cannot currently contain a breach in the database or
infrastructure himself. If Hayven grows even slightly, a second person with
production access (or at minimum, documented emergency-access credentials held
securely by the Deputy) should exist before this is treated as reliable.

---

## 3. Detection sources

What would actually surface a breach, given what's built today:

- **Sentry** (EU/Frankfurt, `sendDefaultPii: false`) — application errors,
  including anomaly alerts already wired for rate-limit fail-open events and
  transfer-reversal edge cases.
- **`audit_log`** (service-role-only) — verification decisions, clinical record
  access patterns, payout runs, refund decisions, all with actor/action/metadata.
  It also records every admin sign-in (with whether a second factor was used)
  and any account turning two-factor on or off, so a suspected admin-account
  compromise can be checked against when that account actually signed in.
  Reviewing this after a suspected breach is how you'd reconstruct who accessed
  what, when.
- **Supabase's own dashboard** — auth logs, unusual query patterns, failed RLS
  checks (RLS denies don't error loudly by default — see the DPIA's note that a
  blocked update returns 0 rows affected, not a visible error, so a targeted
  review of `audit_log` and direct data spot-checks matter more than waiting for
  an alert).
- **A user report** — a parent, therapist, or pediatrician emailing or messaging
  about something that looks wrong (wrong recipient, unexpected access, a
  suspicious login notification).
- **A vendor notification** — Supabase, Vercel, Resend, Cloudmersive, Sentry,
  Paystack, or PostHog reporting their own incident that could implicate Hayven's
  data. **Whether each vendor is contractually obligated to notify Hayven, and on
  what timeline, is not yet confirmed** — this is the same "DPA execution" gap the
  DPIA's transfer register (§6) already flags as open. Don't assume a vendor will
  proactively tell you; check their status page/security advisories periodically.

---

## 4. Immediate response (first 24 hours)

1. **Contain, don't destroy evidence.** If an account is compromised, suspend it
   — this is fast and effective today: suspension revokes an existing session's
   database access immediately (the AUTH-01 fix closed the gap where a suspended
   account's already-issued token kept working). Don't delete rows, don't wipe
   logs, don't reset things you might need to investigate later.
2. **Note what you know, with timestamps**, the same discipline as a safeguarding
   concern (§4 of `docs/safeguarding-procedure.md`): what happened, how you found
   out, what data appears affected, roughly how many people.
3. **Loop in the Deputy Safeguarding Lead** if the DPO/DSL is unreachable or if a
   second opinion on severity is useful — decision cover, even without technical
   access, still means someone else is thinking about this with you.
4. **Start the clock.** "Becoming aware" of a breach — not "confirming" it — is
   what starts the NDPC's 72-hour notification window
   ([PrivacyNeedle](https://privacyneedle.com/compliance/legislation/the-72-hour-rule-what-ndpa-and-gdpr-say-about-data-breaches/)).
   Don't wait for a full investigation to begin the countdown mentally, even if
   the actual notification (§7) needs more detail than you have in hour one.

---

## 5. Severity and notification-trigger assessment

Use the same likelihood/impact scale as the DPIA (`docs/data-protection-impact-
assessment.md` §10) rather than inventing a separate one:

**Likelihood:** 1 Rare · 2 Unlikely · 3 Possible · 4 Likely · 5 Almost certain
**Impact:** 1 Negligible · 2 Minor · 3 Moderate · 4 Major · 5 Severe

A breach involving clinical/health data about a child, or credential documents
that could enable identity fraud, starts at a high *impact* score almost by
definition, regardless of how few records are involved — this system's data is
disproportionately sensitive for its likely scale.

**NDPC notification is required** (§7) unless the breach is very unlikely to
result in a risk to data subjects' rights — treat that as a high bar to clear,
not a default. **Data-subject notification is required** where the breach is
likely to result in *high* risk (roughly Impact 4-5 on the scale above) — see §8.

---

## 6. NDPC notification (the 72-hour clock)

Nigeria's data protection framework requires notifying the NDPC within 72 hours
of becoming aware of a breach that meets the threshold in §5, providing details of
the breach, the categories and approximate number of data subjects affected, and
the steps taken or proposed to mitigate harm
([PrivacyNeedle](https://privacyneedle.com/compliance/legislation/the-72-hour-rule-what-ndpa-and-gdpr-say-about-data-breaches/),
[Andersen](https://ng.andersen.com/gaid-2025-takes-effect-a-new-data-privacy-compliance-era-for-nigeria-businesses/)).
The NDPC has a page on its own website for reporting a privacy breach, though the
exact submission process, required fields, and any sector-specific expectations for
health-adjacent data **haven't been confirmed by counsel** — this is a citation of
the public requirement, not a walkthrough of the actual filing mechanics.

**Who:** the DPO owns this submission (§2).
**What to include, at minimum:** nature of the breach; approximate categories and
number of data subjects and records affected; likely consequences; measures taken
or proposed to address it and mitigate harm; a contact point for the NDPC to
follow up with.
**When the full picture isn't known within 72 hours:** notify with what's known and
follow up — the clock is a duty to notify promptly, not a deadline to have a
completed investigation.

---

## 7. Data-subject notification

Required, without undue delay, where the breach is likely to result in high risk
to the affected individuals' rights and freedoms
([PrivacyNeedle](https://privacyneedle.com/compliance/legislation/the-72-hour-rule-what-ndpa-and-gdpr-say-about-data-breaches/)).
For Hayven, that's most plausibly triggered by: exposure of a child's clinical/
health data, exposure of therapist credential documents (identity-fraud risk), or
a breach large enough to touch many accounts' authentication data.

**Notification content, in clear language:** what happened, what data was
involved, likely consequences, what Hayven has done or will do about it, and what
the recipient can do (e.g. reset a password, watch for suspicious activity).

**Mechanism:** the existing `sendEmail`/`renderNotificationEmail` infrastructure
(`src/lib/email/send.ts`) already supports a plain-language title/body with an
optional action link and a distinct footer note (used for the pediatrician-
referral parent email) — the same pattern is reusable for a breach notice, rather
than building new email infrastructure under incident pressure. A parent whose
child's data is affected is exactly the audience that infrastructure was already
adapted for once before.

---

## 8. Vendor/processor breach handling

If the breach originates at a vendor (Supabase, Vercel, Resend, Cloudmersive,
Sentry, Paystack, PostHog) rather than in Hayven's own code:

- Hayven is still the data controller for personal data those processors handle
  on its behalf — a vendor's breach doesn't relieve Hayven's own NDPC/data-subject
  notification obligations if the threshold in §5 is met.
- **What each vendor is contractually obligated to tell Hayven, and how fast, is
  not yet confirmed** — the same gap the DPIA's transfer register (§6) flags for
  DPA execution generally. Until that's closed, Hayven's own monitoring (status
  pages, security advisories) is the more reliable detection path than waiting to
  be told.
- Record which vendor, what data of Hayven's they process (per the DPIA's §6
  table), and cross-reference before assuming an incident is unrelated to Hayven.

---

## 9. Scenario playbooks

Grounded in what the system actually does today, not generic advice:

**A therapist's or parent's account is compromised.** Suspend the account
(admin action) — RLS access is revoked immediately (AUTH-01), not just the UI.
Review `audit_log` for what that session accessed while compromised. Reset
credentials before reactivating.

**The database itself is compromised.** This is the most severe scenario and the
one this runbook is least equipped to handle mechanically — it likely requires
Supabase's own incident response, not just Hayven's admin panel. Contact Supabase
support immediately; treat every table as potentially exposed until scoped.
Point-in-Time Recovery being enabled (DPIA risk #12, still open) would matter a
great deal here for containment and recovery — another reason that item is P0.

**A malicious credential document evaded scanning.** Cloudmersive's scan is
fail-closed (a scan failure blocks the upload), but a sufficiently novel malicious
file could still pass a scan that isn't infallible. Pull the file from storage
immediately, do not open it locally, and treat the uploading account as
potentially compromised pending investigation.

**A clinical report was sent to the wrong parent.** Identify exactly which
report, which child's data, and which wrong recipient. This is a data-subject
notification case almost by default (§7) — the wrongly-notified family needs to
be told not to further share what they received, and asked to delete it; the
correct family may also need to know their data was misdirected.

**A therapist accessed information they shouldn't have.** Check whether this was
a system failure (an RLS gap — treat as urgent, since it implies other therapists
could exploit the same gap) or a policy violation by an otherwise-correctly-scoped
therapist (a conduct issue, route through the safeguarding procedure and/or the
Therapist Agreement's suspension terms once it exists).

**Referral data was exposed.** Check the `referrals` table's access path — this
data includes a child's name and a parent's contact detail, collected before the
family had any relationship with Hayven (DPIA risk #14), making the notification
conversation harder: the family may not know Hayven exists yet.

---

## 10. Records

Every incident gets a record, whether or not it crosses the NDPC-notification
threshold: what was raised, by whom, when; what was found; the severity
assessment and who made it; what was done; whether NDPC/data-subject notification
happened and when; outcome; review date. **Where this record lives and how long
it's kept is not yet decided** — should follow the same review as the
safeguarding procedure's own open record-keeping question (`docs/safeguarding-
procedure.md` §7, §9).

---

## 11. Post-incident review

After any incident that reached §5's notification threshold: what let it happen,
what caught it (or didn't), what would have made detection/response faster, and
whether this runbook itself needs updating. Feed findings back into the DPIA's
risk register (§11) and this document.

---

## 12. Open items before this is operative

- [ ] A tabletop exercise — walk through at least one scenario from §9 with the
      DPO and Deputy Safeguarding Lead, not just read the document.
- [ ] Legal counsel confirmation of the exact NDPC notification mechanics (portal,
      required fields, format) — §6 currently cites the public requirement, not a
      walkthrough of the actual filing process.
- [ ] Decide where breach records live and how long they're kept (§10).
- [ ] Confirm each processor's contractual breach-notification obligation to
      Hayven, as part of closing the DPA-execution gap in the DPIA's §6.
- [ ] Address the technical single-point-of-failure in §2 — at minimum, securely
      document emergency production-access steps the Deputy Safeguarding Lead
      could use or hand to someone else if the DPO is truly unreachable during a
      severe incident.
- [ ] Build the actual data-subject breach-notification email template (§7) using
      `renderNotificationEmail`, rather than leaving it as "the infrastructure
      exists" until an incident forces it to be written under pressure.
