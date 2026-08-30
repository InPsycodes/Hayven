import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowRight, IconPlayerPlayFilled } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { CourseCard } from "@/components/learn/course-card";
import { getSession } from "@/lib/auth/session";
import { getPublishedCoursesForTherapist, getTherapistLearnOverview } from "@/lib/courses/queries";
import { LAGOS_TZ } from "@/data/format";

function studiedLabel(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: LAGOS_TZ });
}

export default async function TherapistLearnPage() {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const [courses, overview] = await Promise.all([
    getPublishedCoursesForTherapist(session.userId),
    getTherapistLearnOverview(session.userId),
  ]);

  const pct =
    overview.totalLessons > 0
      ? Math.round((overview.completedLessons / overview.totalLessons) * 100)
      : 0;

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="Learn"
        subtext="Short courses to sharpen your practice on Hayven."
      />

      <div className="flex flex-col gap-5 px-5 py-6 md:px-10 md:py-8">
        {courses.length === 0 ? (
          <p className="rounded-2xl bg-canvas-white p-6 text-sm text-muted-foreground ring-1 ring-charcoal/10">
            No courses published yet — check back soon.
          </p>
        ) : (
          <>
            {/* Overview */}
            <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-canvas-white p-5 ring-1 ring-charcoal/10">
              <ProgressRing value={overview.totalLessons ? overview.completedLessons / overview.totalLessons : 0} size={58} />
              <div>
                <p className="font-serif text-xl text-charcoal">
                  {overview.completedLessons} of {overview.totalLessons} lessons
                </p>
                <p className="label-micro mt-1 text-ink-soft">
                  {overview.courseCount} module{overview.courseCount === 1 ? "" : "s"} · {pct}% complete
                  {overview.lastStudiedAt ? ` · last studied ${studiedLabel(overview.lastStudiedAt)}` : ""}
                </p>
              </div>
            </div>

            {/* Continue */}
            {overview.resume && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-terracotta/25 bg-terracotta/8 p-5">
                <div className="min-w-0">
                  <p className="label-micro text-rust-dark">Continue where you left off</p>
                  <h2 className="mt-1.5 font-heading text-base text-charcoal">
                    {overview.resume.courseTitle} · Lesson {overview.resume.lessonNumber} — {overview.resume.lessonTitle}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overview.resume.categoryName ? `${overview.resume.categoryName} · ` : ""}
                    {overview.resume.lessonNumber} of {overview.resume.lessonCount} in this module
                  </p>
                </div>
                <Link
                  href={`/therapist/learn/${overview.resume.courseSlug}?lesson=${overview.resume.lessonNumber}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rust-dark"
                >
                  <IconPlayerPlayFilled size={14} />
                  Resume
                </Link>
              </div>
            )}

            {/* Curriculum */}
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-charcoal md:text-2xl">Curriculum</h2>
              <span className="text-xs text-ink-soft">
                {courses.length} module{courses.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            <Link
              href="/learn?audience=therapist"
              className="group mt-2 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-rust-dark hover:underline"
            >
              Browse therapist guides
              <IconArrowRight
                size={14}
                stroke={2}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
