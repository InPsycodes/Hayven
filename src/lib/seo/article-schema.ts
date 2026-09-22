import type { RealLearningArticle } from "@/lib/learning/queries";
import { getOrganizationSchema } from "@/lib/seo/organization-schema";
import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Plain Article, not MedicalWebPage -- same liability-boundary reasoning as
 * getOrganizationSchema(): Hayven publishes and curates this content, but
 * isn't itself a medical provider, so author stays the Organization rather
 * than reaching for a medical-review schema this content doesn't actually
 * carry (reviewedBy is a role description like "Reviewed by a licensed
 * speech-language pathologist", not a named clinician -- not enough to back
 * a real Person/reviewedBy claim).
 */
export function getArticleSchema(article: RealLearningArticle) {
  const org = getOrganizationSchema();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    articleSection: article.categoryName ?? undefined,
    author: { "@type": "Organization", name: org.name, url: org.url },
    publisher: { "@type": "Organization", name: org.name, url: org.url, logo: org.logo },
    mainEntityOfPage: `${SITE_URL}/learn/${article.slug}`,
    // Real now that content lives in learning_articles.published_at, unlike
    // the old static fixtures this replaced (which had no tracked date at
    // all, and inventing one would have been worse than omitting it).
    datePublished: article.publishedAt ?? undefined,
  };
}
