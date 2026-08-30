import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RealCourse {
  id: string;
  slug: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  description: string;
  status: "draft" | "published";
  publishedAt: string | null;
  lessonCount: number;
  completedCount: number;
}

export interface RealLesson {
  id: string;
  courseId: string;
  title: string;
  body: string[];
  sortOrder: number;
}

/** Published courses visible to the signed-in therapist, with their own completion progress folded in. */
export async function getPublishedCoursesForTherapist(userId: string): Promise<RealCourse[]> {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("learning_courses")
    .select("id, slug, category_id, title, description, status, published_at, learning_categories(name), learning_lessons(id)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error || !courses) return [];

  const allLessonIds = courses.flatMap((c) => (c.learning_lessons as { id: string }[] | null)?.map((l) => l.id) ?? []);
  const { data: progress } = allLessonIds.length
    ? await supabase.from("learning_lesson_progress").select("lesson_id").eq("user_id", userId).in("lesson_id", allLessonIds)
    : { data: [] as { lesson_id: string }[] };
  const completedIds = new Set((progress ?? []).map((p) => p.lesson_id));

  return courses.map((c) => {
    const lessons = (c.learning_lessons as { id: string }[] | null) ?? [];
    return {
      id: c.id,
      slug: c.slug,
      categoryId: c.category_id,
      categoryName: (c.learning_categories as unknown as { name: string } | null)?.name ?? null,
      title: c.title,
      description: c.description,
      status: c.status === "published" ? "published" : "draft",
      publishedAt: c.published_at,
      lessonCount: lessons.length,
      completedCount: lessons.filter((l) => completedIds.has(l.id)).length,
    };
  });
}

/** A published course's full lesson list for the therapist reader view, plus which lessons they've completed. */
export async function getCourseForTherapist(
  slug: string,
  userId: string
): Promise<{ course: RealCourse; lessons: RealLesson[]; completedLessonIds: string[] } | null> {
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("learning_courses")
    .select("id, slug, category_id, title, description, status, published_at, learning_categories(name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !course) return null;

  const { data: lessonRows } = await supabase
    .from("learning_lessons")
    .select("id, course_id, title, body, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });
  const lessons: RealLesson[] = (lessonRows ?? []).map((l) => ({
    id: l.id,
    courseId: l.course_id,
    title: l.title,
    body: Array.isArray(l.body) ? (l.body as string[]) : [],
    sortOrder: l.sort_order,
  }));

  const lessonIds = lessons.map((l) => l.id);
  const { data: progress } = lessonIds.length
    ? await supabase.from("learning_lesson_progress").select("lesson_id").eq("user_id", userId).in("lesson_id", lessonIds)
    : { data: [] as { lesson_id: string }[] };
  const completedLessonIds = (progress ?? []).map((p) => p.lesson_id);

  return {
    course: {
      id: course.id,
      slug: course.slug,
      categoryId: course.category_id,
      categoryName: (course.learning_categories as unknown as { name: string } | null)?.name ?? null,
      title: course.title,
      description: course.description,
      status: "published",
      publishedAt: course.published_at,
      lessonCount: lessons.length,
      completedCount: completedLessonIds.length,
    },
    lessons,
    completedLessonIds,
  };
}

/** Admin-only: every course regardless of status, for the /admin/learning/courses list. */
export async function getAllCoursesForAdmin(): Promise<RealCourse[]> {
  const admin = createAdminClient();
  const { data: courses, error } = await admin
    .from("learning_courses")
    .select("id, slug, category_id, title, description, status, published_at, learning_categories(name), learning_lessons(id)")
    .order("updated_at", { ascending: false });
  if (error || !courses) return [];

  return courses.map((c) => {
    const lessons = (c.learning_lessons as { id: string }[] | null) ?? [];
    return {
      id: c.id,
      slug: c.slug,
      categoryId: c.category_id,
      categoryName: (c.learning_categories as unknown as { name: string } | null)?.name ?? null,
      title: c.title,
      description: c.description,
      status: c.status === "published" ? "published" : "draft",
      publishedAt: c.published_at,
      lessonCount: lessons.length,
      completedCount: 0,
    };
  });
}

/** Admin-only: a course and its lessons regardless of status, for the course-builder page. */
export async function getCourseForAdmin(id: string): Promise<{ course: RealCourse; lessons: RealLesson[] } | null> {
  const admin = createAdminClient();
  const { data: course, error } = await admin
    .from("learning_courses")
    .select("id, slug, category_id, title, description, status, published_at, learning_categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (error || !course) return null;

  const { data: lessonRows } = await admin
    .from("learning_lessons")
    .select("id, course_id, title, body, sort_order")
    .eq("course_id", id)
    .order("sort_order", { ascending: true });
  const lessons: RealLesson[] = (lessonRows ?? []).map((l) => ({
    id: l.id,
    courseId: l.course_id,
    title: l.title,
    body: Array.isArray(l.body) ? (l.body as string[]) : [],
    sortOrder: l.sort_order,
  }));

  return {
    course: {
      id: course.id,
      slug: course.slug,
      categoryId: course.category_id,
      categoryName: (course.learning_categories as unknown as { name: string } | null)?.name ?? null,
      title: course.title,
      description: course.description,
      status: course.status === "published" ? "published" : "draft",
      publishedAt: course.published_at,
      lessonCount: lessons.length,
      completedCount: 0,
    },
    lessons,
  };
}
