"use client";

import { useMemo, useState, useTransition } from "react";
import { IconCircleCheck, IconCircle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLesson } from "@/lib/courses/queries";
import { setLessonComplete } from "@/lib/courses/actions";

function LessonRow({
  lesson,
  index,
  initialComplete,
  state,
  open,
  onToggleOpen,
  onOpenNext,
  hasNext,
}: {
  lesson: RealLesson;
  index: number;
  initialComplete: boolean;
  state: "done" | "current" | "upcoming";
  open: boolean;
  onToggleOpen: () => void;
  onOpenNext: () => void;
  hasNext: boolean;
}) {
  const [complete, setComplete] = useState(initialComplete);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const toggle = guard(() => {
    const next = !complete;
    setError(null);
    startTransition(async () => {
      const result = await setLessonComplete(lesson.id, next);
      if (result.ok) setComplete(next);
      else setError(result.error);
      reset();
    });
  });

  return (
    <div
      className={cn(
        "rounded-xl bg-card ring-1 transition-colors",
        state === "current" ? "ring-terracotta/60" : "ring-border",
        state === "upcoming" && !open && "opacity-70"
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={complete ? `Mark "${lesson.title}" incomplete` : `Mark "${lesson.title}" complete`}
          aria-pressed={complete}
          className="shrink-0 text-terracotta disabled:opacity-50"
        >
          {complete ? (
            <IconCircleCheck size={22} stroke={1.75} />
          ) : (
            <IconCircle size={22} stroke={1.75} className={state === "upcoming" ? "text-ink-soft" : ""} />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="font-mono text-xs text-ink-soft tabular-nums">{index + 1}</span>
          <span className={cn("flex-1 text-sm text-charcoal", state === "current" ? "font-semibold" : "font-medium")}>
            {lesson.title}
          </span>
          {lesson.estMinutes > 0 && (
            <span className="shrink-0 font-mono text-[11px] text-ink-soft tabular-nums">
              {lesson.estMinutes} min
            </span>
          )}
        </button>
      </div>

      {error && <p className="px-4 pb-3 text-xs text-error-text">{error}</p>}

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 pl-[52px]">
          {lesson.body.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-charcoal">
              {paragraph}
            </p>
          ))}
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggle}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rust-dark disabled:opacity-50"
            >
              <IconCircleCheck size={13} stroke={2} />
              {complete ? "Mark incomplete" : "Mark complete"}
            </button>
            {hasNext && (
              <button
                type="button"
                onClick={onOpenNext}
                className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs font-semibold text-charcoal transition-colors hover:bg-muted"
              >
                Next lesson
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LessonList({
  lessons,
  completedLessonIds,
  initialOpenIndex,
}: {
  lessons: RealLesson[];
  completedLessonIds: string[];
  initialOpenIndex?: number;
}) {
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const currentIndex = lessons.findIndex((l) => !completedSet.has(l.id));
  const [openIndex, setOpenIndex] = useState<number | null>(
    initialOpenIndex != null && initialOpenIndex >= 0 && initialOpenIndex < lessons.length
      ? initialOpenIndex
      : null
  );

  return (
    <div className="flex flex-col gap-2">
      {lessons.map((lesson, index) => {
        const done = completedSet.has(lesson.id);
        const state: "done" | "current" | "upcoming" = done
          ? "done"
          : index === currentIndex
            ? "current"
            : "upcoming";
        return (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={index}
            initialComplete={done}
            state={state}
            open={openIndex === index}
            onToggleOpen={() => setOpenIndex((v) => (v === index ? null : index))}
            onOpenNext={() => setOpenIndex(index + 1 < lessons.length ? index + 1 : null)}
            hasNext={index + 1 < lessons.length}
          />
        );
      })}
    </div>
  );
}
