import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARTICLES, FEATURED_ARTICLE, FEATURED_THERAPIST_ARTICLE, PARENT_CATEGORIES, THERAPIST_CATEGORIES } from "@/data/articles";

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
        image_url: article.imageSrc?.src ?? null,
        featured: article.featured,
        status: "published",
        published_at: new Date().toISOString(),
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
