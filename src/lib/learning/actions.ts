"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import type { LearningAudience } from "./queries";

export type ActionResult<T = object> = { ok: true } & T | { ok: false; error: string };

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends -2, -3, ... until the slug is free. Article volume here is small (tens, not thousands), so a loop of individual existence checks is simpler than a single clever query. */
async function uniqueSlug(admin: ReturnType<typeof createAdminClient>, base: string, excludeId?: string): Promise<string> {
  let candidate = base || "article";
  let n = 2;
  for (;;) {
    let query = admin.from("learning_articles").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export interface LearningArticleInput {
  title: string;
  audience: LearningAudience;
  categoryId: string | null;
  excerpt: string;
  body: string[];
  readTime: string;
  reviewedBy: string;
  imageUrl: string;
}

function validateInput(input: LearningArticleInput): string | null {
  if (!input.title.trim()) return "Title is required.";
  if (!input.excerpt.trim()) return "Excerpt is required.";
  if (input.body.length === 0 || input.body.every((p) => !p.trim())) return "Body can't be empty.";
  return null;
}

export async function createLearningArticle(input: LearningArticleInput): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const validationError = validateInput(input);
  if (validationError) return { ok: false, error: validationError };

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, slugify(input.title));

  const { data, error } = await admin
    .from("learning_articles")
    .insert({
      slug,
      audience: input.audience,
      category_id: input.categoryId,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      body: input.body.filter((p) => p.trim()),
      read_time: input.readTime.trim() || null,
      reviewed_by: input.reviewedBy.trim() || null,
      image_url: input.imageUrl.trim() || null,
      status: "draft",
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't create the article." };

  await logAuditEvent({ actor: session, action: "learning_article.create", entityType: "learning_article", entityId: data.id });
  revalidatePath("/admin/learning");
  return { ok: true, id: data.id };
}

export async function updateLearningArticle(id: string, input: LearningArticleInput): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const validationError = validateInput(input);
  if (validationError) return { ok: false, error: validationError };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("learning_articles").select("title, slug").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Article not found." };

  // Re-slugging on every title edit would break already-shared/indexed links,
  // so the slug only changes if the title changed enough to no longer match
  // its own slug's word-stem -- in practice: keep the existing slug unless
  // this is effectively a rename.
  const slug = slugify(input.title) === slugify(existing.title) ? existing.slug : await uniqueSlug(admin, slugify(input.title), id);

  const { error } = await admin
    .from("learning_articles")
    .update({
      slug,
      audience: input.audience,
      category_id: input.categoryId,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      body: input.body.filter((p) => p.trim()),
      read_time: input.readTime.trim() || null,
      reviewed_by: input.reviewedBy.trim() || null,
      image_url: input.imageUrl.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({ actor: session, action: "learning_article.update", entityType: "learning_article", entityId: id });
  revalidatePath("/admin/learning");
  revalidatePath(`/admin/learning/${id}`);
  revalidatePath("/learn");
  return { ok: true };
}

export async function setLearningArticleStatus(id: string, status: "draft" | "published"): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("learning_articles")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Article not found." };

  await logAuditEvent({
    actor: session,
    action: status === "published" ? "learning_article.publish" : "learning_article.unpublish",
    entityType: "learning_article",
    entityId: id,
  });
  revalidatePath("/admin/learning");
  revalidatePath("/learn");
  return { ok: true };
}

export async function deleteLearningArticle(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data, error } = await admin.from("learning_articles").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Article not found." };

  await logAuditEvent({ actor: session, action: "learning_article.delete", entityType: "learning_article", entityId: id });
  revalidatePath("/admin/learning");
  revalidatePath("/learn");
  return { ok: true };
}

export async function createLearningCategory(name: string, audience: LearningAudience): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (!name.trim()) return { ok: false, error: "Category name is required." };

  const admin = createAdminClient();
  const { data: existingCount } = await admin.from("learning_categories").select("id").eq("audience", audience);
  const { data, error } = await admin
    .from("learning_categories")
    .insert({ name: name.trim(), audience, sort_order: existingCount?.length ?? 0 })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "This category already exists for this audience." };
    return { ok: false, error: error?.message ?? "Couldn't create the category." };
  }

  await logAuditEvent({ actor: session, action: "learning_category.create", entityType: "learning_category", entityId: data.id });
  revalidatePath("/admin/learning");
  return { ok: true, id: data.id };
}

export async function deleteLearningCategory(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data, error } = await admin.from("learning_categories").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Category not found." };

  await logAuditEvent({ actor: session, action: "learning_category.delete", entityType: "learning_category", entityId: id });
  revalidatePath("/admin/learning");
  return { ok: true };
}
