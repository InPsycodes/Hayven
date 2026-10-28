import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Deliberately a plain Organization, never MedicalBusiness/MedicalOrganization
 * -- Hayven is a booking marketplace connecting families with independent
 * therapists, not itself a care provider. The Terms of Service frame it as a
 * marketplace specifically to keep that liability boundary clear; medical-
 * provider schema here would contradict that. Individual therapists get
 * their own Person schema instead (see therapists/[id]/page.tsx).
 */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hayven",
    legalName: "Hayven Health Limited",
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-full.png`,
    description:
      "Hayven connects Nigerian families with verified psychologists and speech, occupational, and ABA therapists for children.",
    email: "hayvenmind@gmail.com",
    telephone: "+2348122832137",
    address: {
      "@type": "PostalAddress",
      streetAddress: "No. 17, Aganga Williams, Ogba",
      addressLocality: "Ikeja",
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
    identifier: {
      "@type": "PropertyValue",
      name: "RC Number",
      value: "9879135",
    },
    sameAs: ["https://x.com/hayvenmind"],
  };
}
