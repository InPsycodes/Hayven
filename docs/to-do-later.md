# To do later

Everything still open as of 28 October 2026, grouped by area, most important first in each group.
Tick items off as they are done. Some older items may already be done; each one says how to check.

## 1. Payments (Flutterwave)

Test mode works for payments, booking confirmation (redirect and webhook), refunds starting, and bank account checks.

- [ ] **Unblock therapist payouts.** Flutterwave refused the first transfer: "Please enable IP Whitelisting". Vercel has no fixed IP address to whitelist. Send the support message asking them to switch whitelisting off for transfers. If they refuse, pay therapists by hand from the Flutterwave dashboard during the pilot. Full options: top of `docs/backlog.md`.
- [ ] **Retest the payout** once that is sorted: Admin, then Payouts, then run. Teresa John has a cleared ₦16,000 test earning waiting.
- [ ] **Confirm the test refund finished.** Refund 110126 (₦19,570) was "processing" at Flutterwave. It should show as refunded in Admin, then Refunds. If it is still processing after a day or two, ask Flutterwave whether test refunds complete.
- [ ] **Ask Flutterwave three questions:** is the 2% + VAT fee capped per transaction; do they keep the fee when a payment is refunded; where is customer data stored. The last answer goes to counsel and into the DPIA.
- [ ] **Go live with real money**, only after the above:
  - In Flutterwave, switch to Live mode and copy the live secret key.
  - In Live mode settings, set the webhook URL `https://hayven.com.ng/api/webhooks/flutterwave` and a new secret hash. Live and test have separate settings.
  - Put the live key and hash in Vercel, then redeploy.
  - Make one small real booking, pay, and refund it.
- [ ] **Remove the old Paystack variables** (`PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`) from Vercel and `.env.local`. Nothing uses them now.
- [ ] Optional: set `MEETING_BASE_URL` in Vercel if you want virtual sessions to get a video link automatically. Without it, therapists paste their own link.

## 2. Remove test data from the live site

The live site and the test data share one database, so real families can see some of this.

- [ ] **Teresa John (test therapist) is publicly bookable now.** Hide or delete her once payouts are tested. Her email is `maxwelly2000.my+teresa@gmail.com`.
- [ ] **Today's test bookings** by the parent account Yusuf Ademola with Teresa: three confirmed and one cancelled (refunded), plus the test earning and the failed payout record.
- [ ] **Older test accounts:** QA Test Parent, QA Test Therapist, "Test Parent", "Ada Test", and the parent account Google sign-in created during testing. QA Test Child has test sessions and reports.
- [ ] An old completed test booking from 1 September still has a Paystack test payment attached.

## 3. Accounts and security

- [ ] **Turn on database backups (point-in-time recovery)** in Supabase. It was confirmed off on 19 September. Without it, a bad mistake or attack could lose data permanently. It is a paid add-on.
- [ ] **Reconsider two-factor login.** It was removed for everyone on 9 October. There are now two admins with full access to children's records and money, which makes this riskier. The DPIA lists it as a top risk.
- [ ] **Google sign-in housekeeping:** move the Google consent screen from "Testing" to "In production"; reset the Google client secret (it appeared in a screenshot); remove the old `hayven-hayven.vercel.app` redirect from Supabase.
- [ ] **Dr. Abike's admin access:** she has full admin powers, including refunds, payouts and suspending accounts. Decide whether to build a restricted clinical role for her. Her name on the account reads "Akinwale Gbenusola"; she can fix it under Admin, then Settings.
- [ ] **Name the safeguarding leads** (the DSL and deputy) in the system. Until then, every admin sees safeguarding concerns, which now includes Dr. Abike.

## 4. Legal and paperwork

- [ ] **Send the counsel and adviser pack** (`docs/for-counsel/`, start with "Review Pack"). Not sent yet.
- [ ] **Co-founder documents signed** by you and Dr. Abike (`docs/for-cofounder/`). Fill the blanks first: addresses, registration body, share numbers. Counsel to review before signing.
- [ ] **Therapist agreement:** once counsel approves the text, put it in `src/content/therapist-agreement.ts`. Click-to-accept stays switched off until then.
- [ ] **NDPC registration:** counsel to say whether Hayven must register as a data controller.
- [ ] **Privacy policy and DPIA updates:** Flutterwave's data location (after their answer), report PDF downloads, parent observations from the home practice check-in, and the exact breach-notification deadline under the NDPA.

## 5. Product checks

- [x] **Next.js security advisory.** Done 29 October: Next.js 16.4.0 to 16.4.3, Sentry 10.70 to 10.78 and DOMPurify 3.4.16 to 3.4.17, pushed live.
- [ ] Not urgent: the remaining audit warnings are all in test and build tools (vitest, vite, serwist, shadcn and their dependencies), none of which run on the live site. Update them when convenient; some need major version jumps.
- [ ] **Add ABA Therapy as a specialty.** The database has no ABA specialty, so ABA therapists cannot pick it at signup, and the site's ABA links search therapist bios instead. Needs a small database change.
- [ ] **Dr. Abike's review of Who We Serve.** The age groups' concerns, "who usually helps" lines, and the "who helps" guide are clinical claims she has not reviewed yet. All of it lives in `src/content/marketing/age-groups.ts`.
- [ ] Optional: a different photo for the top of Who We Serve. It currently repeats the home page photo.

- [ ] **Postpartum support (parked 28 October, not ready yet).** A Who We Serve card and page were built and then removed before going live. Before bringing it back: decide how mothers book care for themselves (booking, intake and reports are all built around a child today), have Dr. Abike confirm which professionals can see mothers, and have her review the wording. The removed version was commit `1166bf0`; ask Claude to restore it as a starting point.

- [ ] **Admin clinic screens** (Admin, then Clinics) have never been tried by a person. Click through them once.
- [ ] **Safeguarding pages** for therapists and admins have only been checked in code, never used on the site. Raise one test concern and handle it.
- [ ] Known quirk: when a therapist is hidden from search, parents' booking and message pages show them as just "Therapist". Decide whether that matters.
- [ ] Optional next pricing steps from the October proposal: a typical-price hint for therapists, session packages, paid clinic plans.
