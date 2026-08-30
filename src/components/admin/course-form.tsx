"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLearningCategory } from "@/lib/learning/queries";
import type { RealCourse } from "@/lib/courses/queries";
import { createCourse, updateCourse, type CourseInput } from "@/lib/courses/actions";

export function CourseForm({ course, categories }: { course?: RealCourse; categories: RealLearningCategory[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [categoryId, setCategoryId] = useState(course?.categoryId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const therapistCategories = categories.filter((c) => c.audience === "therapist");

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: CourseInput = { title, description, categoryId: categoryId || null };
    startTransition(async () => {
      if (course) {
        const result = await updateCourse(course.id, input);
        if (!result.ok) {
          setError(result.error);
          reset();
          return;
        }
        router.refresh();
        return;
      }
      const result = await createCourse(input);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      router.push(`/admin/learning/courses/${result.id}`);
    });
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="courseTitle">Title</Label>
        <Input id="courseTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="courseDescription">Description</Label>
        <Textarea
          id="courseDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
          placeholder="One or two sentences shown on the course list."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="courseCategory">Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full" id="courseCategory">
            <SelectValue placeholder="No category" />
          </SelectTrigger>
          <SelectContent>
            {therapistCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? "Saving..." : course ? "Save changes" : "Create course"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/learning/courses")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
