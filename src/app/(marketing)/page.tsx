import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/role-path";
import { Hero } from "@/components/marketing/hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { Specialties } from "@/components/marketing/specialties";
import { QuoteBreather } from "@/components/marketing/quote-breather";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { About } from "@/components/marketing/about";
import { TrustSafety } from "@/components/marketing/trust-safety";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Reveal } from "@/components/marketing/reveal";
import { canonicalFor } from "@/lib/seo/metadata";

const TITLE = "Hayven: A calmer path to the right care for your child";
const DESCRIPTION =
  "Hayven connects Nigerian families with verified psychologists and speech, occupational and ABA therapists, from your first intake form to booking, dashboards and everyday progress.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonicalFor("/"),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/images/hero-family.jpg" }],
  },
};

interface LandingPageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const { source } = await searchParams;
  if (source === "pwa") {
    // Relaunching the installed app should open straight to what you'd
    // actually use it for, not the marketing pitch you already converted on.
    const session = await getSession();
    redirect(session ? roleHomePath(session.role) : "/login");
  }

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
        <Pricing />
      </Reveal>
      <Reveal>
        <DashboardPreview />
      </Reveal>
      <Reveal>
        <About />
      </Reveal>
      <Reveal>
        <TrustSafety />
      </Reveal>
      <Reveal>
        <Faq />
      </Reveal>
      <Reveal>
        <FinalCta />
      </Reveal>
    </div>
  );
}
