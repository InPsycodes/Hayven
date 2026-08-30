"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLearningArticle } from "@/lib/learning/queries";
import { setLearningArticleStatus, deleteLearningArticle } from "@/lib/learning/actions";

function ArticleRow({ article }: { article: RealLearningArticle }) {
  const [status, setStatus] = useState(article.status);
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
          <p className="truncate text-sm font-medium text-charcoal">{article.title}</p>
          <StatusBadge tone={status === "published" ? "sage" : "grey"}>{status === "published" ? "Published" : "Draft"}</StatusBadge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {article.audience === "parent" ? "Parent" : "Therapist"}
          {article.categoryName ? ` · ${article.categoryName}` : ""} · /learn/{article.slug}
        </p>
      </div>
      {/* min-h-11 = the 44px comfort tap-target guideline; sm:min-h-0 hands
          height back to size="sm"'s own h-7 on non-touch/desktop widths,
          where the audit didn't flag this as an issue -- a scoped override
          rather than changing the shared Button component's sm size, which
          is relied on elsewhere for its compact height on purpose. */}
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm" variant="ghost" className="min-h-11 sm:min-h-0">
          <Link href={`/admin/learning/${article.id}/edit`}>Edit</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-11 sm:min-h-0"
          disabled={isPending}
          onClick={statusGuard.guard(() =>
            startTransition(async () => {
              const next = status === "published" ? "draft" : "published";
              const result = await setLearningArticleStatus(article.id, next);
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
              if (!confirm(`Delete "${article.title}"? This can't be undone.`)) {
                deleteGuard.reset();
                return;
              }
              const result = await deleteLearningArticle(article.id);
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

export function LearningArticlesList({ articles }: { articles: RealLearningArticle[] }) {
  if (articles.length === 0) {
    return <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">No articles yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {articles.map((a) => (
        <ArticleRow key={a.id} article={a} />
      ))}
    </div>
  );
}
