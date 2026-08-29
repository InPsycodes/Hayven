"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLearningArticle, RealLearningCategory, LearningAudience } from "@/lib/learning/queries";
import { createLearningArticle, updateLearningArticle, type LearningArticleInput } from "@/lib/learning/actions";

/** Paragraphs are stored as a string[] (see 0057_learning_center_cms.sql) -- a blank line in this textarea is the paragraph break, same convention as the original src/data/articles.ts fixtures read as prose. */
function bodyToText(body: string[]): string {
  return body.join("\n\n");
}
function textToBody(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function LearningArticleForm({
  article,
  categories,
}: {
  article?: RealLearningArticle;
  categories: RealLearningCategory[];
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<LearningAudience>(article?.audience ?? "parent");
  const [categoryId, setCategoryId] = useState<string>(article?.categoryId ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [bodyText, setBodyText] = useState(bodyToText(article?.body ?? []));
  const [readTime, setReadTime] = useState(article?.readTime ?? "");
  const [reviewedBy, setReviewedBy] = useState(article?.reviewedBy ?? "");
  const [imageUrl, setImageUrl] = useState(article?.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { guard, reset } = useSubmitGuard();

  const audienceCategories = categories.filter((c) => c.audience === audience);

  const handleSubmit = guard((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: LearningArticleInput = {
      title,
      audience,
      categoryId: categoryId || null,
      excerpt,
      body: textToBody(bodyText),
      readTime,
      reviewedBy,
      imageUrl,
    };
    startTransition(async () => {
      const result = article ? await updateLearningArticle(article.id, input) : await createLearningArticle(input);
      if (!result.ok) {
        setError(result.error);
        reset();
        return;
      }
      router.push("/admin/learning");
      router.refresh();
    });
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="audience">Audience</Label>
          <Select
            value={audience}
            onValueChange={(v) => {
              setAudience(v as LearningAudience);
              setCategoryId("");
            }}
          >
            <SelectTrigger className="w-full" id="audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="therapist">Therapist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full" id="category">
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              {audienceCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {audienceCategories.length === 0 && (
            <p className="text-xs text-muted-foreground">No categories yet for this audience -- add one below first.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          required
          placeholder="One or two sentences shown in article lists."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={14}
          required
          placeholder="Write in paragraphs, separated by a blank line between each."
        />
        <p className="text-xs text-muted-foreground">Each blank line starts a new paragraph.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="readTime">Read time (optional)</Label>
          <Input id="readTime" value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="6 min read" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reviewedBy">Reviewed by (optional)</Label>
          <Input
            id="reviewedBy"
            value={reviewedBy}
            onChange={(e) => setReviewedBy(e.target.value)}
            placeholder="Reviewed by a licensed speech-language pathologist"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="imageUrl">Image URL (optional)</Label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="/images/learn-example.jpg"
        />
        <p className="text-xs text-muted-foreground">
          Falls back to a category icon tile if left blank.
        </p>
      </div>

      {error && <p className="text-sm text-error-text">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? "Saving..." : article ? "Save changes" : "Create draft"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/learning")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
