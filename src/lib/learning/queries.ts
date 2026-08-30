import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LearningAudience = "parent" | "therapist";

export interface RealLearningCategory {
  id: string;
  name: string;
  audience: LearningAudience;
  sortOrder: number;
}

export interface RealLearningArticle {
  id: string;
  slug: string;
  audience: LearningAudience;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  excerpt: string;
  body: string[];
  readTime: string | null;
  reviewedBy: string | null;
  imageUrl: string | null;
  featured: boolean;
  status: "draft" | "published";
  publishedAt: string | null;
}

const ARTICLE_COLUMNS =
  "id, slug, audience, category_id, title, excerpt, body, read_time, reviewed_by, image_url, featured, status, published_at, learning_categories(name)";

function mapArticleRow(row: {
  id: string;
  slug: string;
  audience: string;
  category_id: string | null;
  title: string;
  excerpt: string;
  body: unknown;
  read_time: string | null;
  reviewed_by: string | null;
  image_url: string | null;
  featured: boolean;
  status: string;
  published_at: string | null;
  learning_categories: { name: string } | null;
}): RealLearningArticle {
  return {
    id: row.id,
    slug: row.slug,
    audience: row.audience === "therapist" ? "therapist" : "parent",
    categoryId: row.category_id,
    categoryName: row.learning_categories?.name ?? null,
    title: row.title,
    excerpt: row.excerpt,
    body: Array.isArray(row.body) ? (row.body as string[]) : [],
    readTime: row.read_time,
    reviewedBy: row.reviewed_by,
    imageUrl: row.image_url,
    featured: row.featured,
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.published_at,
  };
}

/** Public categories for one audience. RLS allows anyone to read these -- see 0057. */
export async function getRealLearningCategories(audience: LearningAudience): Promise<RealLearningCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_categories")
    .select("id, name, audience, sort_order")
    .eq("audience", audience)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, name: row.name, audience, sortOrder: row.sort_order }));
}

/** Published articles for one audience, newest first. RLS restricts this to status = 'published' -- see 0057. */
export async function getRealLearningArticles(audience: LearningAudience): Promise<RealLearningArticle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_articles")
    .select(ARTICLE_COLUMNS)
    .eq("audience", audience)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapArticleRow(row as unknown as Parameters<typeof mapArticleRow>[0]));
}

/** The one featured article for an audience, if any. Powers the /learn hero -- see FEATURED_ARTICLE's old role in src/data/articles.ts. */
export async function getRealFeaturedLearningArticle(audience: LearningAudience): Promise<RealLearningArticle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_articles")
    .select(ARTICLE_COLUMNS)
    .eq("audience", audience)
    .eq("featured", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapArticleRow(data as unknown as Parameters<typeof mapArticleRow>[0]);
}

/** A single published article by slug. Returns null for drafts too -- RLS already hides them, this is the same shape either way. */
export async function getRealLearningArticleBySlug(slug: string): Promise<RealLearningArticle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("learning_articles").select(ARTICLE_COLUMNS).eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return mapArticleRow(data as unknown as Parameters<typeof mapArticleRow>[0]);
}

/**
 * Up to `limit` other published articles to show under an article as
 * "keep reading" -- same category first, then topped up with the newest
 * from the same audience. Never includes the article itself.
 */
export async function getRelatedLearningArticles(
  article: Pick<RealLearningArticle, "id" | "audience" | "categoryId">,
  limit = 3
): Promise<RealLearningArticle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_articles")
    .select(ARTICLE_COLUMNS)
    .eq("audience", article.audience)
    .eq("status", "published")
    .neq("id", article.id)
    .order("published_at", { ascending: false });
  if (error || !data) return [];

  const all = data.map((row) => mapArticleRow(row as unknown as Parameters<typeof mapArticleRow>[0]));
  const sameCategory = article.categoryId
    ? all.filter((a) => a.categoryId === article.categoryId)
    : [];
  const rest = all.filter((a) => !sameCategory.includes(a));
  return [...sameCategory, ...rest].slice(0, limit);
}

/** Admin-only: every article regardless of status, for the /admin/learning list. */
export async function getAllLearningArticlesForAdmin(): Promise<RealLearningArticle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("learning_articles").select(ARTICLE_COLUMNS).order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapArticleRow(row as unknown as Parameters<typeof mapArticleRow>[0]));
}

/** Admin-only: a single article by id, including drafts, for the edit page. */
export async function getLearningArticleByIdForAdmin(id: string): Promise<RealLearningArticle | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("learning_articles").select(ARTICLE_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapArticleRow(data as unknown as Parameters<typeof mapArticleRow>[0]);
}

export interface LearningContentStats {
  publishedArticles: number;
  draftArticles: number;
  parentArticles: number;
  therapistArticles: number;
  courses: number;
  lessons: number;
  parentCategories: number;
  therapistCategories: number;
}

/** Admin-only: headline counts for the Learning Center content dashboard. */
export async function getLearningContentStats(): Promise<LearningContentStats> {
  const admin = createAdminClient();
  const [published, drafts, parent, therapist, courses, lessons, categories] = await Promise.all([
    admin.from("learning_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("learning_articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    admin.from("learning_articles").select("id", { count: "exact", head: true }).eq("audience", "parent"),
    admin.from("learning_articles").select("id", { count: "exact", head: true }).eq("audience", "therapist"),
    admin.from("learning_courses").select("id", { count: "exact", head: true }),
    admin.from("learning_lessons").select("id", { count: "exact", head: true }),
    admin.from("learning_categories").select("audience"),
  ]);

  const cats = categories.data ?? [];
  return {
    publishedArticles: published.count ?? 0,
    draftArticles: drafts.count ?? 0,
    parentArticles: parent.count ?? 0,
    therapistArticles: therapist.count ?? 0,
    courses: courses.count ?? 0,
    lessons: lessons.count ?? 0,
    parentCategories: cats.filter((c) => c.audience === "parent").length,
    therapistCategories: cats.filter((c) => c.audience === "therapist").length,
  };
}

/** Admin-only: every category across both audiences, for the category-manager section. */
export async function getAllLearningCategoriesForAdmin(): Promise<RealLearningCategory[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("learning_categories")
    .select("id, name, audience, sort_order")
    .order("audience", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    audience: row.audience === "therapist" ? "therapist" : "parent",
    sortOrder: row.sort_order,
  }));
}
