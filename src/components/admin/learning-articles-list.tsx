"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { IconSearch } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import type { RealLearningArticle } from "@/lib/learning/queries";
import { setLearningArticleStatus, deleteLearningArticle } from "@/lib/learning/actions";

const ROW_COLS = "sm:grid-cols-[1fr_88px_140px_96px_auto]";

function ArticleRow({ article }: { article: RealLearningArticle }) {
  const [status, setStatus] = useState(article.status);
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
        <p className="truncate text-sm font-medium text-charcoal">{article.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">/learn/{article.slug}</p>
      </div>
      <span className="text-xs text-muted-foreground">
        {article.audience === "parent" ? "Parent" : "Therapist"}
      </span>
      <span className="truncate text-xs text-muted-foreground">{article.categoryName ?? "—"}</span>
      <span>
        <StatusBadge tone={status === "published" ? "sage" : "amber"}>
          {status === "published" ? "Published" : "Draft"}
        </StatusBadge>
      </span>
      {/* min-h-11 keeps the 44px touch target on mobile; sm:min-h-0 hands
          height back to the compact size on desktop. */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
      {error && <p className="text-xs text-error-text sm:col-span-full">{error}</p>}
    </div>
  );
}

export function LearningArticlesList({ articles }: { articles: RealLearningArticle[] }) {
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<"all" | "parent" | "therapist">("all");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(
      (a) =>
        (audience === "all" || a.audience === audience) &&
        (status === "all" || a.status === status) &&
        (!q || a.title.toLowerCase().includes(q) || a.slug.includes(q))
    );
  }, [articles, query, audience, status]);

  return (
    <div className="rounded-sm bg-white p-4 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-md bg-[#F6F4F0] px-3 py-2 focus-within:ring-2 focus-within:ring-terracotta">
          <IconSearch size={15} className="shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles…"
            aria-label="Search articles"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <FilterSelect
          label="Audience"
          value={audience}
          onChange={setAudience}
          options={[
            ["all", "All audiences"],
            ["parent", "Parent"],
            ["therapist", "Therapist"],
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            ["all", "All statuses"],
            ["published", "Published"],
            ["draft", "Draft"],
          ]}
        />
      </div>

      <div className="mt-4">
        <div
          className={`hidden gap-3 border-b border-charcoal/10 px-3 pb-2 sm:grid ${ROW_COLS}`}
        >
          {["Title", "Audience", "Category", "Status", ""].map((h, i) => (
            <span
              key={i}
              className={`label-micro text-muted-foreground ${i === 4 ? "text-right" : ""}`}
            >
              {h}
            </span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {articles.length === 0 ? "No articles yet." : "No articles match these filters."}
          </p>
        ) : (
          filtered.map((a) => <ArticleRow key={a.id} article={a} />)
        )}
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-charcoal outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40"
    >
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}
