# Safeguarding procedure — DRAFT

**Responsible entity:** Hayven Health Limited (RC 9879135), registered at No. 17,
Aganga Williams, Ogba, Ikeja, Lagos State, Nigeria.

> **This is a first draft and is NOT operative.** Hayven connects families
> with therapists working with children; a real safeguarding policy must be
> written or reviewed with (a) a qualified safeguarding/child-protection
> adviser and (b) Nigerian legal counsel, because mandatory-reporting
> duties, the relevant authorities, and record-keeping obligations are
> jurisdiction-specific. Use this only as a starting structure.

## 1. Purpose

To make sure that when someone on the platform has a concern about a
child's welfare or safety, there is a single, known path for raising it,
someone whose job is to act on it, and a record that it was handled.

Scope: any child whose care is arranged through Hayven, and any concern
raised by a parent, a therapist, a supervisor, or surfaced by the platform.

## 2. Roles

| Role | Person | Contact | Cover |
|---|---|---|---|
| Designated Safeguarding Lead (DSL) — receives and decides on every concern | Ademola Yusuf (Founder), named 2026-09-23 | +2348122832137 / hayvenmind@gmail.com | Deputy DSL below |
| Deputy DSL — acts when the DSL is unavailable | Yusuf Omotoyosi, named 2026-09-23 | +2348022884563 / motoyo25@gmail.com | — |

The DSL should be a specific named person, reachable the same working day,
with the authority to contact a family or an external authority without
waiting for anyone else's sign-off.

**Both roles named; still not fully operative.** Naming a DSL and a Deputy
closes the "nobody owns this, no cover" gap this document has flagged since
its first draft — the single-point-of-failure risk of one person (Ademola
Yusuf) holding founder, DPO, and DSL simultaneously is now mitigated by a
distinct deputy who can act if the DSL is unreachable. The sections below
now have draft answers (2026-10-08) for the escalation channel, the external
referral authority, and the admin steps for a therapist conduct concern —
researched against public Lagos State/Nigerian sources, not yet reviewed by
a safeguarding adviser or counsel (see §9). The Deputy DSL should also be
briefed on §3–§6 before being relied on in practice, not just named.

**Real gap found while drafting this revision: the Deputy DSL cannot
currently act.** §5.3's admin steps (ending an assignment, suspending an
account) require an admin account on the platform. Ademola Yusuf (the DSL)
has one as founder; Yusuf Omotoyosi (the Deputy DSL) does not — his admin
grant is still on hold. Until that's resolved, "the Deputy DSL acts when the
DSL is unavailable" is only true for the listening/noting/contacting-family
parts of this procedure, not for the platform-access parts of §5.3.

## 3. What counts as a concern

Any of the following goes to the DSL:

- A **parent discloses** something suggesting a child is being harmed, is at
  risk, or is unsafe at home.
- A **therapist raises a concern** — through the in-app support channel, a
  message, or directly — about a child they're seeing.
- A **session report contains flagged language.** The report generator
  (`src/lib/reports/safety.ts`, `detectFlaggedPhrases`) already surfaces a
  warning to the therapist before they publish, for phrases including:
  *suspected seizure, seizure, self-harm, suicid\*, abuse, police, child
  protective / CPS, bruise, injury at home, parents arguing, lack of
  sleep.* A flag is a prompt to think, not proof of anything — but every
  flagged report that gets published (or that the therapist is unsure
  about) should also be raised with the DSL.
- The platform is asked to hand over a child's records by anyone other than
  that child's parent.

When in doubt: raise it. Over-reporting to the DSL is fine; the DSL filters.

## 4. What to do if a concern comes to you (anyone)

1. **Listen and note, don't investigate.** Write down what was actually
   said or seen, in the person's own words where possible, with the date
   and time. Do not question the child or push a parent for detail — that
   can compromise a later formal process.
2. **Don't promise secrecy.** If a parent or therapist asks you to keep it
   confidential, say plainly that you have to pass safety concerns to the
   person responsible for them, but that it will be handled carefully and
   shared only with those who need to know.
3. **Pass it to the DSL the same working day.** Call or message the DSL
   directly on the contact in §2 (+2348122832137 / hayvenmind@gmail.com) —
   phone for anything urgent, email when it can wait a few hours. If the DSL
   doesn't respond within an hour on something urgent, go to the Deputy DSL
   on the same basis. There's no separate form or shared inbox for this on
   purpose: a safeguarding concern should reach a named person directly, not
   sit in a queue. If it's urgent (a child in immediate danger right now)
   and neither the DSL nor the Deputy DSL is reachable, call the Nigeria
   Police on **112** (the national emergency number) directly, then tell the
   DSL as soon as you can.
4. **Keep the record.** Send your written note to the DSL; don't keep the
   only copy, and don't post it in a general channel.

## 5. What the DSL does

1. **Log it** in the safeguarding record (see §7) within 24 hours of
   receiving it — even if the decision is "no further action".
2. **Decide, and record the reasoning:**
   - *Monitor* — note it, ask the therapist to watch, review by a set date.
   - *Contact the family* — a direct, non-judgmental conversation.
   - *Refer externally* — to the **Lagos State Domestic and Sexual Violence
     Response Team (DSVRT)**, toll-free 24/7 on **0800 033 3333**
     (www.dsvrtlagos.org), which takes reports of child abuse, neglect and
     maltreatment as well as domestic/sexual violence, or to the **Lagos
     State Child Protection Unit** (Ministry of Youth and Social
     Development, Alausa — 08023079008 / 09077333426 / 08172437792) for a
     formal child-welfare referral. If a child under Hayven's care is based
     outside Lagos State, use that state's equivalent — the DSL should
     confirm the right contact at the time, not assume DSVRT covers it.
     **This is current as of a 2026-10-08 web search, not a legal
     confirmation — the safeguarding adviser/counsel in §9 should verify
     these are still the correct, current contacts before this procedure is
     adopted**, and re-check periodically after.
   - *Immediate escalation* — Nigeria Police, **112**, if a child is in
     danger now.
3. **Manage the therapist relationship** — if the concern is *about* a
   therapist's conduct:
   - **End their access to that specific child immediately**: Admin →
     the child's care team → end that therapist-child assignment. This
     revokes their access to the child's record right away.
   - **Decide on the wider account** while it's looked into: either
     **suspend the account** (Admin → Accounts → Suspend — blocks all
     platform access immediately, including any other children on their
     caseload) if the concern is serious enough to pull them off everything,
     or **offboard** (ends every assignment and cancels future bookings,
     without blocking login) if a full removal from caseload is right but
     an outright suspension isn't yet warranted. The DSL decides which;
     when in doubt, suspend — it's reversible, and under-reacting to a
     conduct concern is the worse failure mode.
4. **Close the loop** — record the outcome and any review date. Tell the
   person who raised it that it was actioned (not necessarily the detail).

## 6. What NOT to do

- Don't run your own investigation or gather "evidence".
- Don't delay because you're not certain — that's the DSL's call, not yours.
- Don't discuss it beyond the DSL and people who need to act.
- Don't note it in a place the family or an accused therapist can read
  (e.g. a parent-visible report field, a shared channel).
- Don't let a safeguarding concern sit in a general support queue — it
  jumps the queue, straight to the DSL.

## 7. Records

- Safeguarding records are kept **outside the main Hayven application
  database** — not in `therapy_sessions`, `reports`, or any table a
  therapist, supervisor, or parent's session can ever touch, even via a bug.
  Until a dedicated system is built, the draft recommendation is a
  restricted, access-logged store the DSL and Deputy DSL alone can reach —
  e.g. a dedicated, access-controlled folder (not a general shared drive),
  with access limited to those two named accounts and changes to that access
  list logged. **This needs a real decision, not just this draft**: building
  a proper in-app safeguarding-records table (admin-only RLS, its own audit
  trail, matching the existing `audit_log` pattern) is the stronger
  long-term answer and is a concrete, scoped build — flag to engineering
  once the adviser/counsel review in §9 confirms what a record must contain.
- Retention: **no Nigeria-specific statutory period was found for
  safeguarding/child-protection records specifically.** The Nigeria Data
  Protection Act 2023 sets a general principle — keep personal data no
  longer than necessary for its purpose — and explicitly preserves the
  Child's Rights Act 2003's primacy over children's data, but neither
  specifies a retention period for this category of record. A commonly used
  international default for child-protection records (not Nigeria-specific)
  is **until the child turns 18, plus a buffer of several years** — proposed
  here as a starting point, not a settled answer. **Counsel must confirm
  the right period under Nigerian law** (and whether the Child's Rights Act
  or NDPC guidance says anything more specific) before this is adopted.
- Each record: what was raised, by whom, when; what the DSL decided and
  why; what was done; outcome; review date.

## 8. Review

- This procedure is reviewed **annually, and after any incident that uses
  it** (whichever comes first resets the clock) — a single "annually or"
  choice lets a bad incident go unreviewed for up to a year; both triggers
  closes that gap. Owned by the DSL.
- Every therapist accepts it at onboarding and it's linked from their
  dashboard. **Not yet built.** Once this procedure is adopted (not before —
  there's no point asking therapists to accept a draft), this needs: a
  clause in the Therapist Agreement referencing it, an explicit acceptance
  step in therapist onboarding (same shape as the existing Terms/Privacy
  checkbox at signup), and a link to it from the therapist dashboard. Flag
  to engineering once adopted.

## 9. Open items before this is operative

- [ ] **Legal review** — confirm the draft referral authority (§5.2, Lagos
      DSVRT / Child Protection Unit), the draft retention period (§7, "until
      18 plus a buffer" is a placeholder), and whether Nigerian law imposes
      any mandatory-reporting duty beyond what §3–§5 already describe.
- [ ] **Safeguarding adviser review of §3–§6** — the draft escalation
      channel, concern triage, and DSL decision process (2026-10-08) have
      not been reviewed by anyone with safeguarding expertise.
- [x] Name the DSL — **Ademola Yusuf (Founder), named 2026-09-23**, contact
      published in §2.
- [x] Name a Deputy DSL — **Yusuf Omotoyosi, named 2026-09-23**, contact
      published in §2. Still needed: brief the deputy on §3–§6, **and grant
      the Deputy DSL an admin account** — without one, he cannot execute
      §5.3's access-control steps if the DSL is unreachable (see §2).
- [ ] Decide where safeguarding records live (§7 has a draft recommendation
      — a restricted, access-logged store short-term, a proper in-app table
      as the real answer) and build/configure it.
- [ ] Add the "raise a safeguarding concern" route in-app (distinct from
      general support) and the therapist-onboarding acceptance step (§8) —
      hold until this procedure is adopted.
- [ ] Add a DSL-notification hook when a report with flagged phrases is
      published, so a flagged report reaches the DSL automatically instead
      of relying on the therapist to raise it (§3 already asks them to, but
      this closes the gap if one doesn't).
