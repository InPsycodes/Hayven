import type { Metadata } from "next";

import { LegalDocument } from "@/components/marketing/legal-document";
import { canonicalFor } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Terms of Service | Hayven",
  description: "The terms that govern your use of Hayven.",
  alternates: canonicalFor("/terms"),
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

export default function TermsOfServicePage() {
  return (
    <LegalDocument>
        <span className="label-micro text-rust-dark">Legal</span>
        <h1 className="mt-3 font-heading text-3xl leading-tight text-charcoal sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-8 text-base leading-relaxed text-ink-soft">
          Please read these terms before using Hayven. They explain what Hayven is and isn&apos;t, what we ask of
          you, and what you can expect from us. By creating an account or using the Service, you agree to them.
        </p>

        <Section heading="1. Who we are">
          <p>
            Hayven is operated by Hayven Health Limited (RC 9879135)
            (&quot;Hayven,&quot; &quot;we,&quot; &quot;us&quot;), registered in Nigeria, of No. 17, Aganga
            Williams, Ogba, Ikeja, Lagos State, Nigeria.
          </p>
          <p>
            <strong className="text-charcoal">Hayven is a platform, not a clinic.</strong> We connect families
            with independent, verified paediatric therapists, and give therapists tools to record sessions and
            share progress. Therapists using Hayven are independent practitioners responsible for their own
            professional judgment, licensing, and the care they provide. They are not Hayven employees,
            and Hayven does not itself provide therapy.
          </p>
        </Section>

        <Section heading="2. Who can use Hayven">
          <p>
            You must be at least 18 years old to create a parent, therapist, or supervisor account. A child&apos;s
            profile is created and controlled by their registered parent or caregiver, and children do not
            hold their own accounts. You&apos;re responsible for keeping your login credentials secure and for
            all activity under your account.
          </p>
          <p>
            Therapist accounts require passing our verification process (Section 3) before they can be booked
            publicly.
          </p>
        </Section>

        <Section heading="3. Therapist verification">
          <p>
            Before a therapist is listed publicly, we review the credentials, licensing information, and
            supporting documents they submit. This review is a genuine check, not a rubber stamp, but it
            is not a guarantee. Hayven does not warrant the ongoing conduct, availability, or clinical outcomes
            of any therapist. If you have a concern about a therapist&apos;s conduct or credentials, report it to
            us immediately at the contact in Section 14.
          </p>
          <p>
            Therapists must hold current professional indemnity insurance covering the services they provide
            through Hayven, provide proof of it during verification, and keep it in force while they practise on
            Hayven. We may suspend a therapist&apos;s listing if their cover lapses.
          </p>
        </Section>

        <Section heading="4. Bookings, payments, and cancellations">
          <p>
            Each therapist sets their own session price, shown before you book. Payments are processed securely
            by Paystack; Hayven never sees or stores your full card details. A booking is held for you for 15
            minutes while payment completes. If payment isn&apos;t finished in that window, the slot is
            released. Hayven may retain a portion of each payment as a platform fee.
          </p>
          <p>
            You can cancel an upcoming session from your account at any time before it starts. Cancelling does
            not automatically refund a payment already made. Refunds for a paid, cancelled session are
            reviewed and processed by our team directly, not issued automatically by the app.
          </p>
          <p>
            A therapist may also need to cancel a session; if that happens, we&apos;ll notify you and the same
            manual refund review applies to any payment already made.
          </p>
        </Section>

        <Section heading="5. Clinical records and reports">
          <p>
            Session notes, goals, and behaviour tracking are authored by the assigned therapist. Some clinical
            observations are kept as internal notes visible only to therapists and supervisors directly involved
            in a child&apos;s care; parents receive a separate, plain-language report once the therapist publishes
            it. You own the information you provide about your child; we process it to deliver the Service, as
            described in our{" "}
            <a href="/privacy" className="text-terracotta hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </Section>

        <Section heading="6. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5">
            <li>Provide false information about yourself, a child in your care, or your professional credentials</li>
            <li>Use Hayven for anything other than its intended purpose of arranging and supporting paediatric therapy</li>
            <li>Attempt to access another user&apos;s account, or clinical data you&apos;re not authorised to see</li>
            <li>Harass, threaten, or behave abusively toward another user</li>
            <li>Circumvent Hayven&apos;s booking or payment process to arrange or pay for sessions outside the platform</li>
            <li>Interfere with, reverse-engineer, or attempt to disrupt the Service</li>
          </ul>
          <p>We may suspend or terminate an account that violates these terms.</p>
        </Section>

        <Section heading="7. Emergencies">
          <p>
            <strong className="text-charcoal">
              Hayven is not an emergency service, and no therapist on Hayven provides emergency or crisis
              response.
            </strong>{" "}
            If your child is in immediate danger, or you&apos;re experiencing a medical or safety emergency, call
            112 (Nigeria&apos;s national emergency number) or go to your nearest hospital emergency room
            immediately. Do not wait for a message or session on Hayven.
          </p>
        </Section>

        <Section heading="8. Intellectual property">
          <p>
            Hayven&apos;s app, design, and branding belong to us. You keep ownership of the content you submit
            (session notes, messages, uploaded documents); by submitting it, you give us the limited right to
            store and process it in order to provide the Service to you and the other people properly involved
            in a child&apos;s care.
          </p>
        </Section>

        <Section heading="9. Third-party services">
          <p>
            Payments are handled by Paystack under its own terms and privacy practices. We&apos;re not
            responsible for the availability or performance of third-party services we rely on to run Hayven.
          </p>
        </Section>

        <Section heading="10. Disclaimers">
          <p>
            The Service is provided &quot;as is.&quot; Hayven is a platform connecting you with independent
            therapists. We don&apos;t practise therapy ourselves, and we don&apos;t guarantee any
            particular clinical outcome. General information on Hayven (including the Learning Center) is
            educational and does not replace an individualised clinical assessment from your child&apos;s
            therapist.
          </p>
        </Section>

        <Section heading="11. Limitation of liability">
          <p>
            To the fullest extent permitted by Nigerian law, Hayven is not liable for indirect, incidental, or
            consequential damages arising from your use of the Service, or for the acts or omissions of an
            independent therapist using the platform. Nothing in these terms limits liability that cannot be
            limited by law.
          </p>
        </Section>

        <Section heading="12. Suspending or ending your account">
          <p>
            You can request deletion of your account at any time from your profile. We may suspend or terminate
            an account that violates these terms, poses a safety risk, or where we&apos;re required to by law.
            Section 6 of our{" "}
            <a href="/privacy" className="text-terracotta hover:underline">
              Privacy Policy
            </a>{" "}
            explains what happens to your data after deletion.
          </p>
        </Section>

        <Section heading="13. Changes to these terms">
          <p>
            If we make a material change to these terms, we&apos;ll update the effective date above and, for
            significant changes, let you know directly before they take effect. Continuing to use Hayven after a
            change takes effect means you accept the updated terms.
          </p>
        </Section>

        <Section heading="14. Governing law and contact">
          <p>
            These terms are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from
            them will be subject to the exclusive jurisdiction of the courts of Lagos State.
          </p>
          <p>
            Questions about these terms:{" "}
            <a href="mailto:hayvenmind@gmail.com" className="text-terracotta hover:underline">
              hayvenmind@gmail.com
            </a>
            .
          </p>
        </Section>
    </LegalDocument>
  );
}
