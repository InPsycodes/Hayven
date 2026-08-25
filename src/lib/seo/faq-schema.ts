import type { MarketingFaqEntry } from "@/content/marketing/faq";

/**
 * FAQPage schema -- Google's rich-result eligibility and most AI answer
 * engines both key off this matching the visible Q&A content exactly, so
 * this always takes the same MARKETING_FAQS array the Faq component renders
 * rather than a separately-maintained copy.
 */
export function getFaqSchema(faqs: MarketingFaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
