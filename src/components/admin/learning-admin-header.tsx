import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLearningContentStats } from "@/lib/learning/queries";

const TABS = [
  { key: "articles", label: "Articles", href: "/admin/learning" },
  { key: "courses", label: "Courses", href: "/admin/learning/courses" },
  { key: "categories", label: "Categories", href: "/admin/learning/categories" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Shared chrome for the three Learning Center admin views: a title, headline
 * counts, and the tab bar. Fetches its own stats (a handful of count
 * queries) so each page doesn't have to thread them through.
 */
export async function LearningAdminHeader({
  active,
  action,
}: {
  active: TabKey;
  action?: { label: string; href: string };
}) {
  const stats = await getLearningContentStats();
  const tabCounts: Record<TabKey, number> = {
    articles: stats.publishedArticles + stats.draftArticles,
    courses: stats.courses,
    categories: stats.parentCategories + stats.therapistCategories,
  };

  return (
    <div className="px-6 pt-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl text-charcoal">Learning Center content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, review and publish guides and courses for parents and therapists.
          </p>
        </div>
        {action && (
          <Button asChild variant="accent">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Published"
          value={stats.publishedArticles}
          hint={`${stats.parentArticles} parent · ${stats.therapistArticles} therapist`}
        />
        <StatTile
          label="Drafts"
          value={stats.draftArticles}
          hint={stats.draftArticles === 0 ? "all live" : "not yet visible"}
          tone={stats.draftArticles > 0 ? "amber" : undefined}
        />
        <StatTile label="Courses" value={stats.courses} hint={`${stats.lessons} lessons total`} />
        <StatTile
          label="Categories"
          value={stats.parentCategories + stats.therapistCategories}
          hint={`${stats.parentCategories} parent · ${stats.therapistCategories} therapist`}
        />
      </div>

      <div className="mt-6 flex gap-1 border-b border-charcoal/10">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.key === active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab.key === active
                ? "border-terracotta text-charcoal"
                : "border-transparent text-muted-foreground hover:text-charcoal"
            )}
          >
            {tab.label}
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {tabCounts[tab.key]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "amber";
}) {
  return (
    <div className="rounded-sm bg-white p-4 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)]">
      <p className="label-micro text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-2xl text-charcoal tabular-nums">{value}</p>
      <p className={cn("mt-1 text-[11px]", tone === "amber" ? "text-amber-text" : "text-muted-foreground")}>
        {hint}
      </p>
    </div>
  );
}
