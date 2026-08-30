"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLesson } from "@/lib/courses/queries";
import { createLesson, updateLesson, deleteLesson, reorderLessons } from "@/lib/courses/actions";

function bodyToText(body: string[]): string {
  return body.join("\n\n");
}
function textToBody(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function LessonEditor({
  courseId,
  lesson,
  onDone,
}: {
  courseId: string;
  lesson?: RealLesson;
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [bodyText, setBodyText] = useState(bodyToText(lesson?.body ?? []));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = { title, body: textToBody(bodyText) };
    startTransition(async () => {
      const result = lesson ? await updateLesson(lesson.id, courseId, input) : await createLesson(courseId, input);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      router.refresh();
      onDone();
    });
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-sm bg-white p-4 ring-1 ring-border">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`lesson-title-${lesson?.id ?? "new"}`}>Lesson title</Label>
        <Input id={`lesson-title-${lesson?.id ?? "new"}`} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`lesson-body-${lesson?.id ?? "new"}`}>Body</Label>
        <Textarea
          id={`lesson-body-${lesson?.id ?? "new"}`}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={8}
          placeholder="Write in paragraphs, separated by a blank line between each."
        />
      </div>
      {error && <p className="text-sm text-error-text">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="accent" disabled={isPending}>
          {isPending ? "Saving..." : lesson ? "Save lesson" : "Add lesson"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function LessonRow({ courseId, lesson, canMoveUp, canMoveDown, onMove }: {
  courseId: string;
  lesson: RealLesson;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const deleteGuard = useSubmitGuard();
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return <LessonEditor courseId={courseId} lesson={lesson} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-2 rounded-sm bg-white p-3 ring-1 ring-border">
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={!canMoveUp}
          aria-label={`Move "${lesson.title}" up`}
          className="text-muted-foreground hover:text-charcoal disabled:opacity-30"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={!canMoveDown}
          aria-label={`Move "${lesson.title}" down`}
          className="text-muted-foreground hover:text-charcoal disabled:opacity-30"
        >
          ▼
        </button>
      </div>
      <p className="flex-1 text-sm font-medium text-charcoal">{lesson.title}</p>
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={deleteGuard.guard(() =>
          startTransition(async () => {
            if (!confirm(`Delete lesson "${lesson.title}"?`)) {
              deleteGuard.reset();
              return;
            }
            await deleteLesson(lesson.id, courseId);
            router.refresh();
            deleteGuard.reset();
          })
        )}
      >
        Delete
      </Button>
    </div>
  );
}

export function LessonManager({ courseId, lessons }: { courseId: string; lessons: RealLesson[] }) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [, startTransition] = useTransition();

  function move(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    const reordered = [...lessons];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      await reorderLessons(courseId, reordered.map((l) => l.id));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {lessons.map((lesson, i) => (
        <LessonRow
          key={lesson.id}
          courseId={courseId}
          lesson={lesson}
          canMoveUp={i > 0}
          canMoveDown={i < lessons.length - 1}
          onMove={(direction) => move(i, direction)}
        />
      ))}
      {lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}

      {addingNew ? (
        <LessonEditor courseId={courseId} onDone={() => setAddingNew(false)} />
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setAddingNew(true)} className="w-fit">
          Add lesson
        </Button>
      )}
    </div>
  );
}
