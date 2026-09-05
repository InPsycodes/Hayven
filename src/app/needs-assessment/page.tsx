import type { Metadata } from "next";

import { MatchingQuiz } from "@/components/quiz/matching-quiz";
import { canonicalFor } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Find the right therapist — 2-minute quiz",
  description:
    "Answer three quick questions about your child and we'll narrow Hayven's verified therapists to the ones that fit.",
  alternates: canonicalFor("/needs-assessment"),
};

export default function NeedsAssessmentPage() {
  return (
    <main id="main" className="min-h-[calc(100vh-var(--pwa-reserve,0px))] bg-charcoal">
      <MatchingQuiz />
    </main>
  );
}
