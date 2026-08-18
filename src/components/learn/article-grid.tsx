"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconSearch, IconClock } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";
import type { Article } from "@/data/articles";

export function ArticleGrid({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
    );
  }, [articles, query]);

  return (
    <div>
      <div className="flex max-w-lg items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-border">
        <IconSearch size={17} className="shrink-0 text-ink-soft" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try &lsquo;my child isn&rsquo;t talking yet&rsquo;"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/70"
        />
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-charcoal">Guides</h2>
        <span className="text-sm text-ink-soft">
          {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
        </span>
      </div>

      <div className="mt-2 flex flex-col divide-y divide-border">
        {filtered.map((article) => {
          const meta = LEARN_TOPIC_META[article.category];
          return (
            <Link
              key={article.slug}
              href={`/learn/${article.slug}`}
              className="group grid grid-cols-[72px_1fr] items-center gap-4 py-5 sm:grid-cols-[100px_1fr] sm:gap-6"
            >
              <div
                className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl ${article.imageSrc ? "" : (meta?.tileClass ?? "bg-paper text-ink-soft")}`}
              >
                {article.imageSrc ? (
                  <Image
                    src={article.imageSrc}
                    alt=""
                    fill
                    placeholder="blur"
                    sizes="(min-width: 640px) 100px, 72px"
                    className="photo-treatment size-full object-cover"
                  />
                ) : (
                  meta && <Icon icon={meta.icon} size="lg" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                {meta && (
                  <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${meta.chipClass}`}>
                    {article.category}
                  </span>
                )}
                <h3 className="font-serif text-base leading-snug text-charcoal transition-colors group-hover:text-rust-dark sm:text-lg">
                  {article.title}
                </h3>
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <IconClock size={13} stroke={1.75} />
                  {article.readTime}
                </span>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-soft">
            No guides match &ldquo;{query}&rdquo; yet.
          </p>
        )}
      </div>
    </div>
  );
}
