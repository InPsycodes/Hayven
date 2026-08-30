import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";
import type { RealCourse } from "@/lib/courses/queries";

/**
 * Course card for the therapist Learn grid -- the guide card's structural
 * cousin (courses carry no image), with a progress bar and a state pill.
 */
export function CourseCard({ course }: { course: RealCourse }) {
  const meta = course.categoryName ? LEARN_TOPIC_META[course.categoryName] : undefined;
  const pct =
    course.lessonCount > 0 ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
  const state =
    course.completedCount === 0
      ? { label: "Not started", tone: "grey" as const }
      : course.completedCount >= course.lessonCount
        ? { label: "Complete", tone: "sage" as const }
        : { label: "In progress", tone: "rust" as const };
  const current = state.label === "In progress";

  return (
    <Link
      href={`/therapist/learn/${course.slug}`}
      className={`group flex flex-col gap-3 rounded-2xl bg-canvas-white p-5 ring-1 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] transition-all hover:-translate-y-0.5 ${
        current ? "ring-terracotta/50" : "ring-charcoal/10 hover:ring-charcoal/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {course.categoryName && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
              meta?.chipClass ?? "bg-paper text-ink-soft"
            }`}
          >
            {course.categoryName}
          </span>
        )}
        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
      </div>

      <div>
        <h3 className="font-serif text-base leading-snug text-charcoal group-hover:text-rust-dark sm:text-lg">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">{course.description}</p>
      </div>

      <div className="mt-auto">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-terracotta transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          {course.completedCount}/{course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"}
          {course.estMinutes > 0 ? ` · ~${course.estMinutes} min` : ""}
        </p>
      </div>
    </Link>
  );
}
