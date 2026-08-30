import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CourseList } from "@/components/admin/course-list";
import { getAllCoursesForAdmin } from "@/lib/courses/queries";

export default async function AdminCoursesPage() {
  const courses = await getAllCoursesForAdmin();

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 md:p-8">
        <div>
          <h1 className="font-heading text-xl text-charcoal">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured, multi-lesson courses for the therapist Learning Center, with per-therapist completion
            tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/admin/learning">Articles</Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/admin/learning/courses/new">New course</Link>
          </Button>
        </div>
      </div>

      <div className="px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] md:p-6">
          <h2 className="label-micro text-rust-dark">Courses ({courses.length})</h2>
          <div className="mt-5">
            <CourseList courses={courses} />
          </div>
        </section>
      </div>
    </div>
  );
}
