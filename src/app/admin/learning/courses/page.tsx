import { LearningAdminHeader } from "@/components/admin/learning-admin-header";
import { CourseList } from "@/components/admin/course-list";
import { getAllCoursesForAdmin } from "@/lib/courses/queries";

export default async function AdminCoursesPage() {
  const courses = await getAllCoursesForAdmin();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <LearningAdminHeader active="courses" action={{ label: "New course", href: "/admin/learning/courses/new" }} />

      <div className="px-6 py-6 md:px-8">
        <p className="mb-4 text-sm text-muted-foreground">
          Structured, multi-lesson courses for the therapist Learning Center, with per-therapist
          completion tracking.
        </p>
        <CourseList courses={courses} />
      </div>
    </div>
  );
}
