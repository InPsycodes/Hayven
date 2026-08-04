import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { Specialties } from "@/components/marketing/specialties";
import { QuoteBreather } from "@/components/marketing/quote-breather";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { About } from "@/components/marketing/about";
import { FinalCta } from "@/components/marketing/final-cta";
import { Reveal } from "@/components/marketing/reveal";

const TITLE = "Hayven: A calmer path to the right care for your child";
const DESCRIPTION =
  "Hayven connects Nigerian families with verified speech, occupational and ABA therapists, from your first intake form to booking, dashboards and everyday progress.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/images/hero-family.jpg" }],
  },
};

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Reveal>
        <TrustStrip />
      </Reveal>
      <Reveal>
        <Specialties />
      </Reveal>
      <Reveal>
        <QuoteBreather />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <DashboardPreview />
      </Reveal>
      <Reveal>
        <About />
      </Reveal>
      <Reveal>
        <FinalCta />
      </Reveal>
    </div>
  );
}
