"use client";

import { useState, useTransition } from "react";
import { IconCircleCheck, IconCircle } from "@tabler/icons-react";

import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLesson } from "@/lib/courses/queries";
import { setLessonComplete } from "@/lib/courses/actions";

function LessonRow({ lesson, initialComplete }: { lesson: RealLesson; initialComplete: boolean }) {
  const [complete, setComplete] = useState(initialComplete);
  const [open, setOpen] = useState(false);
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
    <div className="rounded-sm bg-white ring-1 ring-border">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={complete ? `Mark "${lesson.title}" incomplete` : `Mark "${lesson.title}" complete`}
          aria-pressed={complete}
          className="shrink-0 text-terracotta disabled:opacity-50"
        >
          {complete ? <IconCircleCheck size={22} stroke={1.75} /> : <IconCircle size={22} stroke={1.75} />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 text-left text-sm font-medium text-charcoal"
        >
          {lesson.title}
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
        </div>
      )}
    </div>
  );
}

export function LessonList({ lessons, completedLessonIds }: { lessons: RealLesson[]; completedLessonIds: string[] }) {
  const completedSet = new Set(completedLessonIds);
  return (
    <div className="flex flex-col gap-2">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} initialComplete={completedSet.has(lesson.id)} />
      ))}
    </div>
  );
}
