import { NextResponse } from "next/server";
import type { StaticImageData } from "next/image";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARTICLES, FEATURED_ARTICLE, FEATURED_THERAPIST_ARTICLE, PARENT_CATEGORIES, THERAPIST_CATEGORIES } from "@/data/articles";

import sessionNotesImage from "../../../../../public/images/learn-therapist-session-notes.jpg";
import verificationImage from "../../../../../public/images/learn-therapist-verification.jpg";
import profileNoticedImage from "../../../../../public/images/learn-therapist-profile-noticed.jpg";
import messagingBoundariesImage from "../../../../../public/images/learn-therapist-messaging-boundaries.jpg";
import settingAvailabilityImage from "../../../../../public/images/learn-therapist-setting-availability.jpg";
import bookingConfirmedImage from "../../../../../public/images/learn-therapist-booking-confirmed.jpg";
import supervisorImage from "../../../../../public/images/learn-therapist-supervisor.jpg";
import cancellationsImage from "../../../../../public/images/learn-therapist-cancellations.jpg";
import endingCareImage from "../../../../../public/images/learn-therapist-ending-care.jpg";

// article.imageSrc is a Next.js static import -- its .src is a build-hashed
// path (/_next/static/media/...hash....jpg) that changes on every deploy,
// not something safe to store. The same import of the same file resolves to
// the same cached module object, so this maps each StaticImageData back to
// its real, stable public/ path by reference rather than by the hash.
const STABLE_IMAGE_PATH = new Map<StaticImageData, string>([
  [sessionNotesImage, "/images/learn-therapist-session-notes.jpg"],
  [verificationImage, "/images/learn-therapist-verification.jpg"],
  [profileNoticedImage, "/images/learn-therapist-profile-noticed.jpg"],
  [messagingBoundariesImage, "/images/learn-therapist-messaging-boundaries.jpg"],
  [settingAvailabilityImage, "/images/learn-therapist-setting-availability.jpg"],
  [bookingConfirmedImage, "/images/learn-therapist-booking-confirmed.jpg"],
  [supervisorImage, "/images/learn-therapist-supervisor.jpg"],
  [cancellationsImage, "/images/learn-therapist-cancellations.jpg"],
  [endingCareImage, "/images/learn-therapist-ending-care.jpg"],
]);

/**
 * One-time migration: moves the ~60 hardcoded articles in
 * src/data/articles.ts into the learning_articles/learning_categories
 * tables added by migration 0057. Runs as a real Next.js route (not a
 * standalone script) specifically so the existing `imageSrc` static
 * imports resolve the normal way -- outside Next's module pipeline those
 * imports don't work at all.
 *
 * Idempotent: upserts articles by slug and categories by (name, audience),
 * so it's safe to call more than once (e.g. if a new article is added to
 * the fixture file later and this needs a re-run). Delete this route once
 * the migration has been run and confirmed -- it has no reason to exist
 * afterward.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const summary = { categoriesCreated: 0, articlesUpserted: 0, errors: [] as string[] };

  const categoryIdByKey = new Map<string, string>();
  const categoryDefs: { name: string; audience: "parent" | "therapist" }[] = [
    ...PARENT_CATEGORIES.filter((c) => c !== "All").map((name) => ({ name, audience: "parent" as const })),
    ...THERAPIST_CATEGORIES.filter((c) => c !== "All").map((name) => ({ name, audience: "therapist" as const })),
  ];

  for (const [i, def] of categoryDefs.entries()) {
    const { data: existing } = await admin
      .from("learning_categories")
      .select("id")
      .eq("name", def.name)
      .eq("audience", def.audience)
      .maybeSingle();
    if (existing) {
      categoryIdByKey.set(`${def.audience}:${def.name}`, existing.id);
      continue;
    }
    const { data, error } = await admin
      .from("learning_categories")
      .insert({ name: def.name, audience: def.audience, sort_order: i })
      .select("id")
      .single();
    if (error || !data) {
      summary.errors.push(`category ${def.audience}/${def.name}: ${error?.message}`);
      continue;
    }
    categoryIdByKey.set(`${def.audience}:${def.name}`, data.id);
    summary.categoriesCreated += 1;
  }

  // FEATURED_ARTICLE / FEATURED_THERAPIST_ARTICLE are separate top-level
  // exports, not entries inside ARTICLES -- getArticleBySlug() in the
  // current static-file code only ever searches ARTICLES, so these two
  // are actually unreachable by slug today. Included here (with
  // featured: true) so the migration doesn't quietly drop them.
  const featuredSlugs = new Set([FEATURED_ARTICLE.slug, FEATURED_THERAPIST_ARTICLE.slug]);
  const allArticles = [
    { ...FEATURED_ARTICLE, featured: true },
    { ...FEATURED_THERAPIST_ARTICLE, featured: true },
    ...ARTICLES.filter((a) => !featuredSlugs.has(a.slug)).map((a) => ({ ...a, featured: false })),
  ];

  // Which slugs already exist -- so a re-run (e.g. to push an edited fixture)
  // updates content without resetting published_at, which drives the Article
  // schema's datePublished and the sitemap's lastModified.
  const { data: existingRows } = await admin.from("learning_articles").select("slug, published_at");
  const publishedAtBySlug = new Map(
    (existingRows ?? []).map((r) => [r.slug as string, r.published_at as string | null])
  );

  for (const article of allArticles) {
    const categoryId = categoryIdByKey.get(`${article.audience}:${article.category}`) ?? null;
    const { error } = await admin.from("learning_articles").upsert(
      {
        slug: article.slug,
        audience: article.audience,
        category_id: categoryId,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        read_time: article.readTime,
        reviewed_by: article.reviewedBy ?? null,
        image_url: (article.imageSrc && STABLE_IMAGE_PATH.get(article.imageSrc)) ?? null,
        featured: article.featured,
        status: "published",
        published_at: publishedAtBySlug.get(article.slug) ?? new Date().toISOString(),
        created_by: session.userId,
      },
      { onConflict: "slug" }
    );
    if (error) {
      summary.errors.push(`article ${article.slug}: ${error.message}`);
      continue;
    }
    summary.articlesUpserted += 1;
  }

  return NextResponse.json(summary);
}
