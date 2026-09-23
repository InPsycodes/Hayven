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
| Designated Safeguarding Lead (DSL) — receives and decides on every concern | [FILL IN] | [FILL IN — direct phone + email] | [FILL IN: Deputy DSL] |
| Deputy DSL — acts when the DSL is unavailable | [FILL IN] | [FILL IN] | — |

The DSL should be a specific named person, reachable the same working day,
with the authority to contact a family or an external authority without
waiting for anyone else's sign-off.

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
3. **Pass it to the DSL the same working day.** Use [FILL IN: the exact
   channel — a dedicated email, a form, a phone call]. If it's urgent (a
   child in immediate danger) and the DSL is unreachable, contact
   [FILL IN: emergency services / local child-protection authority]
   directly, then tell the DSL.
4. **Keep the record.** Send your written note to the DSL; don't keep the
   only copy, and don't post it in a general channel.

## 5. What the DSL does

1. **Log it** in the safeguarding record (see §7) within 24 hours of
   receiving it — even if the decision is "no further action".
2. **Decide, and record the reasoning:**
   - *Monitor* — note it, ask the therapist to watch, review by a set date.
   - *Contact the family* — a direct, non-judgmental conversation.
   - *Refer externally* — to [FILL IN: the relevant Nigerian authority /
     agency for child-protection referrals], following their process.
   - *Immediate escalation* — emergency services, if a child is in danger now.
3. **Manage the therapist relationship** — if the concern is *about* a
   therapist's conduct, suspend their access to that child (and review all
   their assignments) while it's looked into. [FILL IN: exact admin steps.]
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

- Safeguarding records are kept in [FILL IN: where — a restricted store,
  not the main app DB unless access is properly locked down], accessible
  only to the DSL and Deputy DSL.
- Retention: [FILL IN — child-protection records are typically kept for a
  long, legally-defined period; get this from counsel].
- Each record: what was raised, by whom, when; what the DSL decided and
  why; what was done; outcome; review date.

## 8. Review

- This procedure is reviewed [FILL IN: annually / after any incident],
  owned by the DSL.
- Every therapist accepts it at onboarding and it's linked from their
  dashboard. [FILL IN: wire this into the therapist agreement / onboarding
  step once the policy is final.]

## 9. Open items before this is operative

- [ ] Legal review — mandatory reporting duties in Nigeria, which authority
      referrals go to, record-retention period.
- [ ] Safeguarding adviser review of §3–§6.
- [ ] Name the DSL and Deputy DSL; publish their contact route.
- [ ] Decide where safeguarding records live and lock down access.
- [ ] Add the "raise a safeguarding concern" route in-app (distinct from
      general support) and the therapist-onboarding acceptance step.
- [ ] Add a DSL-notification hook when a report with flagged phrases is
      published.
