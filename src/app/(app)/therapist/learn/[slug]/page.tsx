import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { LessonList } from "@/components/therapist/lesson-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";
import { getSession } from "@/lib/auth/session";
import { getCourseForTherapist, getNextPublishedCourse } from "@/lib/courses/queries";

export default async function TherapistCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;
  const result = await getCourseForTherapist(slug, session.userId);
  if (!result) notFound();

  const { course, lessons, completedLessonIds } = result;
  const next = await getNextPublishedCourse(slug);
  const done = course.completedCount >= course.lessonCount && course.lessonCount > 0;
  const remaining = course.lessonCount - course.completedCount;
  const chipClass = course.categoryName
    ? LEARN_TOPIC_META[course.categoryName]?.chipClass ?? "bg-paper text-ink-soft"
    : "bg-paper text-ink-soft";

  // ?lesson=<1-based> from the "Resume" button -> 0-based index for LessonList.
  const openIndex = lessonParam ? Number(lessonParam) - 1 : undefined;

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting={course.title}
        subtext={`${course.completedCount}/${course.lessonCount} lessons complete`}
      />

      <div className="flex flex-col gap-5 px-5 py-6 md:px-10 md:py-8">
        <Link
          href="/therapist/learn"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-charcoal"
        >
          <IconArrowLeft size={16} />
          All courses
        </Link>

        {/* Course header */}
        <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-canvas-white p-5 ring-1 ring-charcoal/10 md:p-6">
          <div className="min-w-0 flex-1">
            {course.categoryName && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${chipClass}`}
              >
                {course.categoryName}
              </span>
            )}
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">{course.description}</p>
            <p className="label-micro mt-3 text-ink-soft">
              {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
              {course.estMinutes > 0 ? ` · ~${course.estMinutes} min` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProgressRing
              value={course.lessonCount ? course.completedCount / course.lessonCount : 0}
              size={62}
            />
            {done && <StatusBadge tone="sage">Complete</StatusBadge>}
          </div>
        </div>

        {lessons.length === 0 ? (
          <p className="rounded-2xl bg-canvas-white p-6 text-sm text-muted-foreground ring-1 ring-charcoal/10">
            This course doesn&apos;t have any lessons yet.
          </p>
        ) : (
          <LessonList
            lessons={lessons}
            completedLessonIds={completedLessonIds}
            initialOpenIndex={openIndex}
          />
        )}

        {/* What's next */}
        {lessons.length > 0 && (
          <div className="rounded-xl border border-border bg-canvas-white/60 p-4">
            {done ? (
              next ? (
                <Link
                  href={`/therapist/learn/${next.slug}`}
                  className="group flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-ink-soft">
                    Module complete. Next up:{" "}
                    <span className="font-medium text-charcoal">{next.title}</span>
                  </span>
                  <IconArrowRight
                    size={15}
                    stroke={2}
                    className="shrink-0 text-rust-dark transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              ) : (
                <p className="text-sm text-ink-soft">
                  Module complete — that&apos;s the end of the curriculum for now.
                </p>
              )
            ) : (
              <p className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                <span>
                  Finish all {course.lessonCount}
                  {next ? (
                    <>
                      {" "}
                      to unlock <span className="font-medium text-charcoal">{next.title}</span>
                    </>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-soft tabular-nums">
                  {remaining} left
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
