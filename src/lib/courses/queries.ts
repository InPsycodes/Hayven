import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateMinutes, courseMinutes } from "@/lib/learning/reading";

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
  /** Rounded total reading time across all lessons, in minutes. */
  estMinutes: number;
}

export interface RealLesson {
  id: string;
  courseId: string;
  title: string;
  body: string[];
  sortOrder: number;
  /** Rough per-lesson reading time, in minutes. */
  estMinutes: number;
}

function parseBody(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/** Published courses visible to the signed-in therapist, with their own completion progress folded in. */
export async function getPublishedCoursesForTherapist(userId: string): Promise<RealCourse[]> {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("learning_courses")
    .select(
      "id, slug, category_id, title, description, status, published_at, learning_categories(name), learning_lessons(id, body)"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error || !courses) return [];

  const allLessonIds = courses.flatMap(
    (c) => (c.learning_lessons as { id: string }[] | null)?.map((l) => l.id) ?? []
  );
  const { data: progress } = allLessonIds.length
    ? await supabase.from("learning_lesson_progress").select("lesson_id").eq("user_id", userId).in("lesson_id", allLessonIds)
    : { data: [] as { lesson_id: string }[] };
  const completedIds = new Set((progress ?? []).map((p) => p.lesson_id));

  return courses.map((c) => {
    const lessons = (c.learning_lessons as { id: string; body: unknown }[] | null) ?? [];
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
      estMinutes: courseMinutes(lessons.map((l) => parseBody(l.body))),
    };
  });
}

export interface TherapistLearnOverview {
  courseCount: number;
  totalLessons: number;
  completedLessons: number;
  lastStudiedAt: string | null;
  /** The lesson to drop the therapist back into -- their most recently touched
   *  course's first incomplete lesson, or the very first lesson if they've
   *  never started. Null only when there are no published lessons at all. */
  resume: {
    courseSlug: string;
    courseTitle: string;
    categoryName: string | null;
    lessonTitle: string;
    lessonNumber: number;
    lessonCount: number;
  } | null;
}

export async function getTherapistLearnOverview(userId: string): Promise<TherapistLearnOverview> {
  const empty: TherapistLearnOverview = {
    courseCount: 0,
    totalLessons: 0,
    completedLessons: 0,
    lastStudiedAt: null,
    resume: null,
  };

  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("learning_courses")
    .select("slug, title, learning_categories(name), learning_lessons(id, title, sort_order)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (!courses || courses.length === 0) return empty;

  const normalized = courses.map((c) => ({
    slug: c.slug,
    title: c.title,
    categoryName: (c.learning_categories as unknown as { name: string } | null)?.name ?? null,
    lessons: [...((c.learning_lessons as { id: string; title: string; sort_order: number }[] | null) ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  const allLessonIds = normalized.flatMap((c) => c.lessons.map((l) => l.id));
  if (allLessonIds.length === 0) return { ...empty, courseCount: normalized.length };

  const { data: progressRows } = await supabase
    .from("learning_lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", userId)
    .in("lesson_id", allLessonIds);
  const progress = progressRows ?? [];
  const done = new Set(progress.map((p) => p.lesson_id));
  const lastStudiedAt =
    progress.reduce<string | null>((max, p) => (!max || p.completed_at > max ? p.completed_at : max), null);

  // Resume: the course whose lesson was completed most recently, else the
  // first course. If that course is fully done, move to the first course
  // that still has an incomplete lesson.
  let target = normalized[0];
  if (lastStudiedAt) {
    const recentLessonId = progress.find((p) => p.completed_at === lastStudiedAt)?.lesson_id;
    const owner = normalized.find((c) => c.lessons.some((l) => l.id === recentLessonId));
    if (owner) target = owner;
  }
  if (target.lessons.length > 0 && target.lessons.every((l) => done.has(l.id))) {
    target = normalized.find((c) => c.lessons.some((l) => !done.has(l.id))) ?? target;
  }
  const nextIndex = target.lessons.findIndex((l) => !done.has(l.id));
  const resumeIndex = nextIndex === -1 ? 0 : nextIndex;

  return {
    courseCount: normalized.length,
    totalLessons: allLessonIds.length,
    completedLessons: progress.length,
    lastStudiedAt,
    resume:
      target.lessons.length > 0
        ? {
            courseSlug: target.slug,
            courseTitle: target.title,
            categoryName: target.categoryName,
            lessonTitle: target.lessons[resumeIndex].title,
            lessonNumber: resumeIndex + 1,
            lessonCount: target.lessons.length,
          }
        : null,
  };
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
  const lessons: RealLesson[] = (lessonRows ?? []).map((l) => {
    const body = parseBody(l.body);
    return {
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      body,
      sortOrder: l.sort_order,
      estMinutes: estimateMinutes(body),
    };
  });

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
      estMinutes: courseMinutes(lessons.map((l) => l.body)),
    },
    lessons,
    completedLessonIds,
  };
}

/** The published course after `slug` in the curriculum order -- powers the
 *  "next up" footer on the course reader. Null if this is the last one. */
export async function getNextPublishedCourse(
  slug: string
): Promise<{ slug: string; title: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_courses")
    .select("slug, title, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (!data) return null;
  const index = data.findIndex((c) => c.slug === slug);
  const next = index >= 0 ? data[index + 1] : undefined;
  return next ? { slug: next.slug, title: next.title } : null;
}

/** Admin-only: every course regardless of status, for the /admin/learning/courses list. */
export async function getAllCoursesForAdmin(): Promise<RealCourse[]> {
  const admin = createAdminClient();
  const { data: courses, error } = await admin
    .from("learning_courses")
    .select(
      "id, slug, category_id, title, description, status, published_at, learning_categories(name), learning_lessons(id, body)"
    )
    .order("updated_at", { ascending: false });
  if (error || !courses) return [];

  return courses.map((c) => {
    const lessons = (c.learning_lessons as { id: string; body: unknown }[] | null) ?? [];
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
      estMinutes: courseMinutes(lessons.map((l) => parseBody(l.body))),
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
  const lessons: RealLesson[] = (lessonRows ?? []).map((l) => {
    const body = parseBody(l.body);
    return {
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      body,
      sortOrder: l.sort_order,
      estMinutes: estimateMinutes(body),
    };
  });

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
      estMinutes: courseMinutes(lessons.map((l) => l.body)),
    },
    lessons,
  };
}
