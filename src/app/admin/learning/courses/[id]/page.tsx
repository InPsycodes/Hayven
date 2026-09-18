import { notFound } from "next/navigation";

import { CourseForm } from "@/components/admin/course-form";
import { LessonManager } from "@/components/admin/lesson-manager";
import { getCourseForAdmin } from "@/lib/courses/queries";
import { getAllLearningCategoriesForAdmin } from "@/lib/learning/queries";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, categories] = await Promise.all([getCourseForAdmin(id), getAllLearningCategoriesForAdmin()]);
  if (!result) notFound();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Edit course</h1>
        <p className="mt-1 text-sm text-muted-foreground">/therapist/learn/{result.course.slug}</p>
      </div>
      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section className="max-w-2xl rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <CourseForm course={result.course} categories={categories} />
        </section>

        <section className="max-w-2xl rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <h2 className="label-micro text-rust-dark">Lessons</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lessons publish together with the course -- there&apos;s no separate per-lesson draft state.
          </p>
          <div className="mt-5">
            <LessonManager courseId={result.course.id} lessons={result.lessons} />
          </div>
        </section>
      </div>
    </div>
  );
}
