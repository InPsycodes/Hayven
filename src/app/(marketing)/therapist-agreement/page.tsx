import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalDocument } from "@/components/marketing/legal-document";
import { THERAPIST_AGREEMENT } from "@/content/therapist-agreement";
import { canonicalFor } from "@/lib/seo/metadata";
import { formatDate } from "@/data/format";

export const metadata: Metadata = {
  title: "Therapist Agreement | Hayven",
  description: "The agreement between Hayven and the therapists who practise on it.",
  alternates: canonicalFor("/therapist-agreement"),
};

// 404 until the agreement is adopted (src/content/therapist-agreement.ts):
// the draft isn't something a therapist should be reading as final terms.
export default function TherapistAgreementPage() {
  if (!THERAPIST_AGREEMENT) notFound();

  return (
    <LegalDocument>
      <span className="label-micro text-rust-dark">Legal</span>
      <h1 className="mt-3 font-heading text-3xl leading-tight text-charcoal sm:text-4xl">Therapist Agreement</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Version {THERAPIST_AGREEMENT.version} · Effective {formatDate(THERAPIST_AGREEMENT.effectiveDate)}
      </p>
      {THERAPIST_AGREEMENT.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="font-heading text-xl text-charcoal">{section.heading}</h2>
          <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-ink-soft">
            {section.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </LegalDocument>
  );
}
