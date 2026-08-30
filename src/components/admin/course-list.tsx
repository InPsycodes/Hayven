"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealCourse } from "@/lib/courses/queries";
import { setCourseStatus, deleteCourse } from "@/lib/courses/actions";

function CourseRow({ course }: { course: RealCourse }) {
  const [status, setStatus] = useState(course.status);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();

  if (deleted) return null;

  return (
    <div className="flex flex-col gap-2 rounded-sm bg-[#F6F4F0] p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-charcoal">{course.title}</p>
          <StatusBadge tone={status === "published" ? "sage" : "grey"}>{status === "published" ? "Published" : "Draft"}</StatusBadge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
          {course.categoryName ? ` · ${course.categoryName}` : ""} · /therapist/learn/{course.slug}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm" variant="ghost" className="min-h-11 sm:min-h-0">
          <Link href={`/admin/learning/courses/${course.id}`}>Manage</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-11 sm:min-h-0"
          disabled={isPending}
          onClick={statusGuard.guard(() =>
            startTransition(async () => {
              const next = status === "published" ? "draft" : "published";
              const result = await setCourseStatus(course.id, next);
              if (result.ok) setStatus(next);
              else setError(result.error);
              statusGuard.reset();
            })
          )}
        >
          {status === "published" ? "Unpublish" : "Publish"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="min-h-11 sm:min-h-0"
          disabled={isPending}
          onClick={deleteGuard.guard(() =>
            startTransition(async () => {
              if (!confirm(`Delete "${course.title}" and all its lessons? This can't be undone.`)) {
                deleteGuard.reset();
                return;
              }
              const result = await deleteCourse(course.id);
              if (result.ok) setDeleted(true);
              else setError(result.error);
              deleteGuard.reset();
            })
          )}
        >
          Delete
        </Button>
      </div>
      {error && <p className="w-full text-xs text-error-text">{error}</p>}
    </div>
  );
}

export function CourseList({ courses }: { courses: RealCourse[] }) {
  if (courses.length === 0) {
    return <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">No courses yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {courses.map((c) => (
        <CourseRow key={c.id} course={c} />
      ))}
    </div>
  );
}
