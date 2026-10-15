# Emergency Access Procedure — Hayven — DRAFT

**Responsible entity:** Hayven Health Limited (RC 9879135), registered at No. 17,
Aganga Williams, Ogba, Ikeja, Lagos State, Nigeria.

> **This is a first draft and is NOT operative.** It names a real gap and proposes
> a structure — the actual break-glass mechanism in §2 still needs to be set up
> by the founder on their own accounts, which is not something that can be done
> from this environment. Use this as a starting structure, not a completed
> control.

**Draft date:** 2026-09-23

---

## 1. The gap this document addresses

Confirmed during the breach-response runbook work (`docs/breach-response-runbook.md`
§2) and the DPIA (`docs/data-protection-impact-assessment.md`): Ademola Yusuf
(Founder) currently holds the DPO role, the Designated Safeguarding Lead role, and
is the **only person with any actual production system access** — Supabase,
Vercel, the domain, Flutterwave, and the `hayvenmind@gmail.com` inbox itself.
Yusuf Omotoyosi (Deputy Safeguarding Lead) has decision-making cover if the
founder is unreachable during an incident, but currently has no technical means
to act on that decision.

This is two different problems with two different fixes, not one:

- **Problem A — in-app operational access.** Most of what an emergency actually
  requires (suspending a compromised account, reviewing the audit log, acting on
  a dispute or a flagged report) is already exposed through the app's own
  `/admin` role. This doesn't need infrastructure credentials at all.
- **Problem B — true infrastructure access.** If the founder were genuinely
  unreachable and something needed root-level intervention (rotating a leaked
  key, restoring from a backup, redeploying, accessing the domain registrar),
  in-app admin access doesn't help — that needs the underlying accounts
  themselves.

---

## 2. Problem A: in-app admin access

**Confirmed while investigating this**: there is no self-service "promote to
admin" action anywhere in the app's own UI (`src/components/admin/accounts-
table.tsx` only exposes Suspend/Reactivate and Make/Remove supervisor). Signup
role is server-validated against an allowlist of parent/therapist only — the
app deliberately has **no self-service path to an admin account at all**. That's
a real, intentional security boundary (it's the same reason a compromised
account can't grant itself admin), not an oversight — so "just click a button to
make Yusuf an admin" isn't actually available, and shouldn't be built casually
either, since a self-service admin-grant feature is itself a privilege-
escalation surface worth real design thought before it exists.

**What granting admin access actually requires today**: a direct database role
update by someone who already has production database access — in practice,
the founder (via the Supabase dashboard's table editor, or by asking me to run
it via the service-role key the way every other role/fixture change this
session used). This is a real production action with real consequences (a
second person gets full admin power over live children's clinical data,
payouts, refunds, and account suspension) and needs an explicit go-ahead, not
something to do as a side effect of documenting the gap.

**Recommendation**: grant Yusuf Omotoyosi an admin role. It's the lowest-risk,
highest-leverage fix for Problem A — no infrastructure secrets change hands,
and it directly serves both the safeguarding procedure's and the breach-
response runbook's stated need for someone besides the founder who can act.

---

## 3. Problem B: infrastructure break-glass access

This is harder, and not something I can set up from this environment — it
requires the founder's own action on accounts I have no access to (or only
narrow, task-specific API-key access to, not the accounts themselves).

**What "infrastructure access" actually means here:**

| System | What it controls | Currently accessible to |
|---|---|---|
| Supabase dashboard | The production database, auth, storage, backups | Founder only |
| Vercel dashboard | Deployment, environment variables, domains | Founder only |
| Domain registrar | DNS, the `hayven.com.ng` domain itself | Founder only |
| Flutterwave dashboard | Live payment processing, refunds, payouts | Founder only |
| `hayvenmind@gmail.com` | The email address every processor account (Supabase, Vercel, Resend, Sentry, Cloudmersive, PostHog) is very likely registered to, and the account-recovery path for most of them | Founder only |

**The standard, low-effort way to close this**: a password manager with a
built-in emergency-access feature (1Password's Emergency Kit, Bitwarden's
Emergency Access, or equivalent). These let a designated person request access
after a waiting period the account owner controls, rather than either (a)
sharing live passwords directly (bad — no audit trail, no revocation, no
granularity) or (b) leaving no path at all (the current state).

**What this needs from the founder specifically, not from me:**

- [ ] Put the credentials for the systems in the table above into a password
      manager, if they aren't already centralized in one.
- [ ] Set up that password manager's emergency-access feature, naming Yusuf
      Omotoyosi (or whoever is the right person) as the emergency contact.
- [ ] Decide the waiting period before emergency access activates (most tools
      default to something like 24-48 hours, long enough to stop a false
      alarm, short enough to matter in a real emergency).
- [ ] Tell Yusuf this exists and how to invoke it, so it's not a surprise
      during an actual incident.
- [ ] Record that this is done (not the credentials themselves) in this
      document's open items below, so it's not a silent assumption.

I can't do any of these five steps — they require access to accounts that
exist outside this environment and outside what any API key here can reach.

---

## 4. What this changes in other documents

Once §2 (admin access) is actually granted:

- `docs/breach-response-runbook.md` §2's "technical investigator" row should
  list Yusuf Omotoyosi alongside Ademola Yusuf, not as a placeholder.
- `docs/data-protection-impact-assessment.md`'s risk #6 and §12 P0-1 language
  about "no cover" should be updated to reflect partial (in-app) cover exists,
  while still correctly noting infrastructure-level cover (§3 above) remains
  open until the break-glass mechanism is actually set up.

---

## 5. Open items before this gap is actually closed

- [ ] Decide whether to grant Yusuf Omotoyosi an admin role now (§2) — a real
      production action, needs an explicit go-ahead.
- [ ] Set up a password-manager emergency-access mechanism for the systems in
      §3's table — founder-only action, can't be done from this environment.
- [ ] Once both are done, update the cross-references in §4.
