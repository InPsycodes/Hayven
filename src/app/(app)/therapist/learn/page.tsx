import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getPublishedCoursesForTherapist } from "@/lib/courses/queries";

export default async function TherapistLearnPage() {
  const session = await getSession();
  if (!session || session.role !== "therapist") redirect("/login");

  const courses = await getPublishedCoursesForTherapist(session.userId);

  return (
    <div>
      <DashboardHeader session={session} greeting="Learn" subtext="Short courses to sharpen your practice on Hayven." />
      <div className="flex flex-col gap-3 px-5 py-6 md:px-10 md:py-8">
        {courses.length === 0 ? (
          <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">
            No courses published yet -- check back soon.
          </p>
        ) : (
          courses.map((course) => {
            const percent = course.lessonCount > 0 ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
            return (
              <Link key={course.id} href={`/therapist/learn/${course.slug}`}>
                <Card lift className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {course.categoryName && (
                        <span className="label-micro text-rust-dark">{course.categoryName}</span>
                      )}
                      <h2 className="mt-1 font-heading text-base text-charcoal">{course.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {course.completedCount}/{course.lessonCount}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-terracotta transition-[width]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
