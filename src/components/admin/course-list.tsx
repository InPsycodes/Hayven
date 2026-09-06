"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealCourse } from "@/lib/courses/queries";
import { setCourseStatus, deleteCourse } from "@/lib/courses/actions";

const ROW_COLS = "sm:grid-cols-[1fr_140px_92px_96px_auto]";

function CourseRow({ course }: { course: RealCourse }) {
  const [status, setStatus] = useState(course.status);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();

  if (deleted) return null;

  return (
    <div
      className={`grid gap-2 border-b border-charcoal/8 px-3 py-3 last:border-0 sm:items-center sm:gap-3 ${ROW_COLS}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{course.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">/therapist/learn/{course.slug}</p>
      </div>
      <span className="truncate text-xs text-muted-foreground">{course.categoryName ?? "—"}</span>
      <span className="text-xs text-muted-foreground">
        {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
      </span>
      <span>
        <StatusBadge tone={status === "published" ? "sage" : "amber"}>
          {status === "published" ? "Published" : "Draft"}
        </StatusBadge>
      </span>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
      {error && <p className="text-xs text-error-text sm:col-span-full">{error}</p>}
    </div>
  );
}

export function CourseList({ courses }: { courses: RealCourse[] }) {
  return (
    <div className="rounded-sm bg-white p-4 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-5">
      <div className={`hidden gap-3 border-b border-charcoal/10 px-3 pb-2 sm:grid ${ROW_COLS}`}>
        {["Title", "Category", "Lessons", "Status", ""].map((h, i) => (
          <span key={i} className={`label-micro text-muted-foreground ${i === 4 ? "text-right" : ""}`}>
            {h}
          </span>
        ))}
      </div>
      {courses.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">No courses yet.</p>
      ) : (
        courses.map((c) => <CourseRow key={c.id} course={c} />)
      )}
    </div>
  );
}
