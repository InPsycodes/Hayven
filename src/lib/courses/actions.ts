"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { slugify } from "@/lib/slugify";

export type ActionResult<T = object> = { ok: true } & T | { ok: false; error: string };

async function uniqueCourseSlug(admin: ReturnType<typeof createAdminClient>, base: string, excludeId?: string): Promise<string> {
  let candidate = base || "course";
  let n = 2;
  for (;;) {
    let query = admin.from("learning_courses").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

export interface CourseInput {
  title: string;
  description: string;
  categoryId: string | null;
}

export async function createCourse(input: CourseInput): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!input.description.trim()) return { ok: false, error: "Description is required." };

  const admin = createAdminClient();
  const slug = await uniqueCourseSlug(admin, slugify(input.title));

  const { data, error } = await admin
    .from("learning_courses")
    .insert({
      slug,
      category_id: input.categoryId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: "draft",
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't create the course." };

  await logAuditEvent({ actor: session, action: "learning_course.create", entityType: "learning_course", entityId: data.id });
  revalidatePath("/admin/learning/courses");
  return { ok: true, id: data.id };
}

export async function updateCourse(id: string, input: CourseInput): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!input.description.trim()) return { ok: false, error: "Description is required." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("learning_courses").select("title, slug").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "Course not found." };

  const slug = slugify(input.title) === slugify(existing.title) ? existing.slug : await uniqueCourseSlug(admin, slugify(input.title), id);

  const { error } = await admin
    .from("learning_courses")
    .update({
      slug,
      category_id: input.categoryId,
      title: input.title.trim(),
      description: input.description.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({ actor: session, action: "learning_course.update", entityType: "learning_course", entityId: id });
  revalidatePath("/admin/learning/courses");
  revalidatePath(`/admin/learning/courses/${id}`);
  revalidatePath("/therapist/learn");
  return { ok: true };
}

export async function setCourseStatus(id: string, status: "draft" | "published"): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("learning_courses")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Course not found." };

  await logAuditEvent({
    actor: session,
    action: status === "published" ? "learning_course.publish" : "learning_course.unpublish",
    entityType: "learning_course",
    entityId: id,
  });
  revalidatePath("/admin/learning/courses");
  revalidatePath("/therapist/learn");
  return { ok: true };
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { data, error } = await admin.from("learning_courses").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Course not found." };

  await logAuditEvent({ actor: session, action: "learning_course.delete", entityType: "learning_course", entityId: id });
  revalidatePath("/admin/learning/courses");
  revalidatePath("/therapist/learn");
  return { ok: true };
}

export interface LessonInput {
  title: string;
  body: string[];
}

export async function createLesson(courseId: string, input: LessonInput): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (!input.title.trim()) return { ok: false, error: "Lesson title is required." };

  const admin = createAdminClient();
  const { count } = await admin.from("learning_lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId);

  const { data, error } = await admin
    .from("learning_lessons")
    .insert({
      course_id: courseId,
      title: input.title.trim(),
      body: input.body.filter((p) => p.trim()),
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't add the lesson." };

  await logAuditEvent({ actor: session, action: "learning_lesson.create", entityType: "learning_lesson", entityId: data.id });
  revalidatePath(`/admin/learning/courses/${courseId}`);
  return { ok: true, id: data.id };
}

export async function updateLesson(id: string, courseId: string, input: LessonInput): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };
  if (!input.title.trim()) return { ok: false, error: "Lesson title is required." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("learning_lessons")
    .update({ title: input.title.trim(), body: input.body.filter((p) => p.trim()), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({ actor: session, action: "learning_lesson.update", entityType: "learning_lesson", entityId: id });
  revalidatePath(`/admin/learning/courses/${courseId}`);
  revalidatePath("/therapist/learn");
  return { ok: true };
}

export async function deleteLesson(id: string, courseId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const { error } = await admin.from("learning_lessons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({ actor: session, action: "learning_lesson.delete", entityType: "learning_lesson", entityId: id });
  revalidatePath(`/admin/learning/courses/${courseId}`);
  revalidatePath("/therapist/learn");
  return { ok: true };
}

/** Persists a full reorder in one go -- the admin UI sends the lessons in their new order after a drag/move. */
export async function reorderLessons(courseId: string, orderedLessonIds: string[]): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  const results = await Promise.all(
    orderedLessonIds.map((lessonId, index) =>
      admin.from("learning_lessons").update({ sort_order: index }).eq("id", lessonId).eq("course_id", courseId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath(`/admin/learning/courses/${courseId}`);
  revalidatePath("/therapist/learn");
  return { ok: true };
}

/**
 * Therapist-facing: mark a lesson complete/incomplete for themselves. RLS
 * (user_id = auth.uid()) is the real gate; this session check is the same
 * friendly-error-instead-of-a-silent-RLS-reject pattern used throughout.
 */
export async function setLessonComplete(lessonId: string, complete: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "therapist") return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  if (complete) {
    const { error } = await supabase
      .from("learning_lesson_progress")
      .upsert({ user_id: session.userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("learning_lesson_progress")
      .delete()
      .eq("user_id", session.userId)
      .eq("lesson_id", lessonId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/therapist/learn");
  return { ok: true };
}
