import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { LessonList } from "@/components/therapist/lesson-list";
import { getSession } from "@/lib/auth/session";
import { getCourseForTherapist } from "@/lib/courses/queries";

export default async function TherapistCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const { slug } = await params;
  const result = await getCourseForTherapist(slug, session.userId);
  if (!result) notFound();

  const { course, lessons, completedLessonIds } = result;
  const percent = course.lessonCount > 0 ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;

  return (
    <div>
      <DashboardHeader session={session} greeting={course.title} subtext={`${course.completedCount}/${course.lessonCount} lessons complete`} />
      <div className="flex flex-col gap-4 px-5 py-6 md:px-10 md:py-8">
        <Link href="/therapist/learn" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-charcoal">
          <IconArrowLeft size={16} />
          All courses
        </Link>

        <p className="text-sm text-muted-foreground">{course.description}</p>

        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-terracotta transition-[width]" style={{ width: `${percent}%` }} />
        </div>

        {lessons.length === 0 ? (
          <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">
            This course doesn&apos;t have any lessons yet.
          </p>
        ) : (
          <LessonList lessons={lessons} completedLessonIds={completedLessonIds} />
        )}
      </div>
    </div>
  );
}
