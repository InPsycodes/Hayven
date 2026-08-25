import type { Article } from "@/data/articles";
import { getOrganizationSchema } from "@/lib/seo/organization-schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Plain Article, not MedicalWebPage -- same liability-boundary reasoning as
 * getOrganizationSchema(): Hayven publishes and curates this content, but
 * isn't itself a medical provider, so author stays the Organization rather
 * than reaching for a medical-review schema this content doesn't actually
 * carry (reviewedBy on each Article fixture is a role description like
 * "Reviewed by a licensed speech-language pathologist", not a named
 * clinician -- not enough to back a real Person/reviewedBy claim).
 * No datePublished: these are static editorial fixtures with no real
 * publish date tracked anywhere, and inventing one would be worse than
 * omitting an optional field.
 */
export function getArticleSchema(article: Article) {
  const org = getOrganizationSchema();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    articleSection: article.category,
    author: { "@type": "Organization", name: org.name, url: org.url },
    publisher: { "@type": "Organization", name: org.name, url: org.url, logo: org.logo },
    mainEntityOfPage: `${SITE_URL}/learn/${article.slug}`,
  };
}
