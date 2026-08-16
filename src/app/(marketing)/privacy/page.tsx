import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Hayven",
  description: "How Hayven collects, uses, and protects your family's information.",
};

const EFFECTIVE_DATE = "13 August 2026";

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl text-charcoal">{heading}</h2>
      <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-canvas-white px-6 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-2xl">
        <span className="label-micro text-rust-dark">Legal</span>
        <h1 className="mt-3 font-heading text-3xl leading-tight text-charcoal sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-8 text-base leading-relaxed text-ink-soft">
          Hayven connects Nigerian families with verified paediatric therapists, and helps you stay involved in
          your child&apos;s care between sessions. Doing that well means handling some of the most sensitive
          information a family has &mdash; about a child&apos;s health, development, and behaviour. This policy
          explains, in plain language, what we collect, why, who ever sees it, and the choices you have.
        </p>

        <Section heading="1. Who this policy covers">
          <p>
            This policy applies to parents and caregivers, the children they register for care, therapists,
            clinical supervisors, and administrators using the Hayven platform (the &quot;Service&quot;).
          </p>
          <p>
            Hayven is operated by Hayven{" "}
            <span className="rounded bg-amber/10 px-1 py-0.5 text-[#6f4519]">
              [confirm exact registered company name and RC number]
            </span>{" "}
            (&quot;Hayven,&quot; &quot;we,&quot; &quot;us&quot;), registered in Nigeria, of{" "}
            <span className="rounded bg-amber/10 px-1 py-0.5 text-[#6f4519]">
              [registered business address to be added]
            </span>
            . For everything below, Hayven is the data controller.
          </p>
        </Section>

        <Section heading="2. Information we collect">
          <p>
            <strong className="text-charcoal">Account information, from everyone.</strong> Full name, email
            address, phone number, password (stored securely by our authentication provider, never visible to us
            in plain text), and your role on the platform.
          </p>
          <p>
            <strong className="text-charcoal">About your child, from parents.</strong> First name, date of birth,
            presenting concern, and any diagnoses you or your therapist choose to record. You control what goes
            into your child&apos;s profile.
          </p>
          <p>
            <strong className="text-charcoal">Clinical and session information, from therapists.</strong> Session
            notes, goals, target behaviours, skill tracking, and the reports generated from a session. Some
            observations recorded during a session are confidential clinical notes, visible only to therapists
            directly involved in your child&apos;s care &mdash; never included in the report shared with you.
          </p>
          <p>
            <strong className="text-charcoal">Professional information, from therapists.</strong> Professional
            bio, qualifications, licensing/credential documents, years of practice, and specialties, used to
            verify a therapist before they&apos;re listed publicly.
          </p>
          <p>
            <strong className="text-charcoal">Booking, payment, and messages.</strong> Session bookings, and
            messages exchanged between a parent and therapist about a booking. Payments are processed by
            Paystack &mdash; Hayven never receives or stores your full card details (see Section 5).
          </p>
          <p>
            <strong className="text-charcoal">Technical information.</strong> Basic device and access logs kept
            by our hosting providers for security purposes (for example, sign-in timestamps). We do not run
            third-party advertising trackers or sell any data to data brokers.
          </p>
        </Section>

        <Section heading="3. Why we collect it">
          <p>We use your information to:</p>
          <ul className="list-disc pl-5">
            <li>Create and secure your account, and verify a therapist&apos;s credentials before they can practise on Hayven</li>
            <li>Match families with therapists, and manage bookings, scheduling, and payments</li>
            <li>Let a therapist record session data and generate reports you can review</li>
            <li>Let clinical supervisors oversee the therapists they&apos;re responsible for</li>
            <li>Investigate safety concerns, enforce our terms, and keep an audit trail of sensitive actions (e.g. who approved a therapist, who accessed a clinical record)</li>
            <li>Comply with legal, tax, and professional record-keeping obligations</li>
          </ul>
          <p>
            Our legal basis is, depending on the activity: your consent (for example, registering your child and
            their health information), the necessity of processing to perform our contract with you (bookings,
            payments), and our legitimate interest in keeping the platform safe (audit logs, fraud prevention).
            Where we rely on consent, you can withdraw it at any time &mdash; see Section 7.
          </p>
        </Section>

        <Section heading="4. Children's data">
          <p>
            Hayven is not directed at children, and children do not create their own accounts. A child&apos;s
            profile is created and controlled entirely by their registered parent or caregiver, who is the one
            consenting to its collection. Only the therapist(s) actively assigned to a child, that child&apos;s
            supervising clinician (where applicable), the child&apos;s own parent, and Hayven administrators (for
            safety and support purposes) can ever see a child&apos;s clinical information &mdash; enforced at the
            database level, not just in the app&apos;s screens.
          </p>
          <p>
            If you believe a child&apos;s information was added to Hayven without appropriate parental consent,
            contact us immediately at the email in Section 10 and we will investigate and remove it.
          </p>
        </Section>

        <Section heading="5. Who we share information with">
          <p>
            We don&apos;t sell your data. We share it only as needed to run the Service:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong className="text-charcoal">Other Hayven users, by role.</strong> A therapist sees the
              children assigned to them; a supervisor sees the therapists they oversee; a parent sees their own
              child&apos;s published reports and messages. These boundaries are enforced by database-level access
              rules, not just by what a screen happens to show.
            </li>
            <li>
              <strong className="text-charcoal">Supabase</strong> (database, authentication, and file storage) and{" "}
              <strong className="text-charcoal">Netlify</strong> (application hosting) &mdash; our infrastructure
              providers, bound by their own security and confidentiality obligations.
            </li>
            <li>
              <strong className="text-charcoal">Paystack</strong> &mdash; to process payments. Paystack receives
              what&apos;s needed to complete your transaction directly; Hayven never sees or stores your full card
              number.
            </li>
            <li>
              <strong className="text-charcoal">Legal or safety exceptions.</strong> If required by law, or where
              we believe in good faith it&apos;s necessary to protect a child&apos;s safety or the rights of
              others.
            </li>
          </ul>
        </Section>

        <Section heading="6. How long we keep it">
          <p>The periods below are our current defaults, applied consistently across the Service:</p>
          <ul className="list-disc pl-5">
            <li>
              <strong className="text-charcoal">Active accounts.</strong> Kept for as long as your account is
              active.
            </li>
            <li>
              <strong className="text-charcoal">After you delete your account.</strong> Personal account
              information (name, contact details, non-clinical data) is deleted within 30 days of a verified
              deletion request.
            </li>
            <li>
              <strong className="text-charcoal">Clinical records</strong> (session notes, reports, goals,
              behaviour data) are kept for up to 6 years after a child&apos;s last recorded session, in line with
              standard clinical record-keeping practice &mdash; even after an account is deleted &mdash; to
              support continuity of care and meet professional record-keeping obligations.
            </li>
            <li>
              <strong className="text-charcoal">Payment and transaction records</strong> are kept for 6 years, in
              line with standard financial record-keeping practice.
            </li>
            <li>
              <strong className="text-charcoal">Security and audit logs</strong> are kept for 24 months, then
              deleted.
            </li>
          </ul>
        </Section>

        <Section heading="7. Your rights">
          <p>Under the Nigeria Data Protection Act (NDPA), you can ask us to:</p>
          <ul className="list-disc pl-5">
            <li>Confirm what personal data we hold about you or your child, and get a copy of it</li>
            <li>Correct information that&apos;s inaccurate or out of date</li>
            <li>Delete your account and associated personal data, subject to the retention periods in Section 6</li>
            <li>Withdraw a consent you previously gave us</li>
            <li>Object to, or ask us to restrict, a particular use of your data</li>
          </ul>
          <p>
            To exercise any of these, email us at the address in Section 10. We&apos;ll respond within the
            timeframe required by the NDPA. If you&apos;re not satisfied with our response, you have the right to
            lodge a complaint with the Nigeria Data Protection Commission (NDPC).
          </p>
        </Section>

        <Section heading="8. How we protect your information">
          <p>
            Access to clinical and personal data is restricted by role at the database level, so a therapist can
            only ever query the children actually assigned to them, not the wider platform. Passwords are hashed
            by our authentication provider, never stored by Hayven in readable form. Data is encrypted in transit
            between your device and our servers. Sensitive administrative actions (verification decisions,
            record access, payment corrections) are recorded in an internal audit trail.
          </p>
          <p>No system is perfectly secure, and we can&apos;t guarantee absolute security of any transmission.</p>
        </Section>

        <Section heading="9. Cookies and local storage">
          <p>
            Hayven uses only the cookies and on-device storage needed to keep you signed in and let the app work
            offline as an installed PWA. We don&apos;t use third-party advertising or cross-site tracking
            cookies.
          </p>
        </Section>

        <Section heading="10. Contact us">
          <p>
            Questions, concerns, or a request about your data:{" "}
            <a href="mailto:hayvenmind@gmail.com" className="text-terracotta hover:underline">
              hayvenmind@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section heading="11. Changes to this policy">
          <p>
            If we make a material change to this policy, we&apos;ll update the effective date above and, for
            significant changes, let you know directly (by email or in-app) before they take effect.
          </p>
        </Section>
      </div>
    </div>
  );
}
