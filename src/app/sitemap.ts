import type { MetadataRoute } from "next";

import { ARTICLES } from "@/data/articles";
import { getRealVerifiedTherapists } from "@/lib/therapist/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/learn`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/needs-assessment`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = ARTICLES.map((article) => ({
    url: `${SITE_URL}/learn/${article.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Public, admin-verified therapist profiles -- each one is an individually
  // indexable page (see (marketing)/therapists/[id]/page.tsx and its Person
  // schema), so they belong in the sitemap the same as any other content
  // page. Empty today (no verified therapists yet); fills in on its own as
  // profiles get approved, no code change needed then.
  const verifiedTherapists = await getRealVerifiedTherapists();
  const therapistRoutes: MetadataRoute.Sitemap = verifiedTherapists.map((therapist) => ({
    url: `${SITE_URL}/therapists/${therapist.id}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes, ...therapistRoutes];
}
