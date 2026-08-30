"use client";

import { useMemo, useState } from "react";
import { IconSearch } from "@tabler/icons-react";

import { GuideCard, type GuideCardData } from "@/components/learn/guide-card";

export interface GuideGridItem extends GuideCardData {
  key: string;
  /** Pre-lowercased title + excerpt, for client-side search. */
  searchText: string;
}

/**
 * Plain-language search over the guide list plus the card grid itself.
 */
export function GuideGrid({ guides }: { guides: GuideGridItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter((g) => g.searchText.includes(q));
  }, [guides, query]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full max-w-md items-center gap-2 rounded-full bg-canvas-white px-4 py-2.5 ring-1 ring-border">
          <IconSearch size={17} className="shrink-0 text-ink-soft" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try &lsquo;my child isn&rsquo;t talking yet&rsquo;"
            aria-label="Search guides"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/70"
          />
        </div>
        <span className="shrink-0 text-sm text-ink-soft">
          {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-canvas-white p-10 text-center text-sm text-ink-soft ring-1 ring-charcoal/10">
          {query.trim()
            ? `No guides match “${query.trim()}” yet.`
            : "No guides here yet — check back soon."}
        </p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((guide) => (
            <GuideCard key={guide.key} guide={guide} />
          ))}
        </div>
      )}
    </div>
  );
}
