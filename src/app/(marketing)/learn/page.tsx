import { Suspense } from "react";
import Link from "next/link";
import { IconSearch } from "@tabler/icons-react";

import { AudienceToggle } from "@/components/learn/audience-toggle";
import { CategoryPills } from "@/components/learn/category-pills";
import {
  FEATURED_ARTICLE,
  FEATURED_THERAPIST_ARTICLE,
  PARENT_CATEGORIES,
  THERAPIST_CATEGORIES,
  getArticlesForAudience,
  type Audience,
} from "@/data/articles";

interface LearnPageProps {
  searchParams: Promise<{ category?: string; audience?: string }>;
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const { category, audience: audienceParam } = await searchParams;
  const audience: Audience = audienceParam === "therapist" ? "therapist" : "parent";
  const featured = audience === "therapist" ? FEATURED_THERAPIST_ARTICLE : FEATURED_ARTICLE;
  const categories = audience === "therapist" ? THERAPIST_CATEGORIES : PARENT_CATEGORIES;

  const filtered = getArticlesForAudience(audience).filter(
    (a) => a.slug !== featured.slug && (!category || category === "All" || a.category === category)
  );

  return (
    <div className="flex flex-col">
      <section className="bg-offwhite px-6 pb-5 pt-12 md:px-10">
        <div className="mx-auto max-w-4xl">
          <span className="label-micro text-terracotta">Learning Center</span>
          <h1 className="mt-3 font-heading text-3xl leading-tight text-charcoal md:text-4xl">
            Understand what your child is going through, one clear answer at a time.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Plain-language guides written with therapists. Start with what you&apos;re
            noticing, not a diagnosis.
          </p>

          <div className="mt-6 flex max-w-lg items-center gap-2 rounded-sm bg-white p-1.5 ring-1 ring-border">
            <IconSearch size={18} className="ml-2 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Try 'my child isn't talking yet'"
              className="w-full bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="mt-6">
            <Suspense>
              <AudienceToggle active={audience} />
            </Suspense>
          </div>

          <div className="mt-4">
            <Suspense>
              <CategoryPills categories={categories} />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 md:px-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/learn/${featured.slug}`}
            className="flex flex-col gap-4 rounded-md bg-charcoal p-8 text-offwhite transition-opacity hover:opacity-95 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex flex-col gap-2">
              <span className="label-micro text-terracotta">Featured</span>
              <h2 className="font-heading text-xl leading-snug md:max-w-lg">
                {featured.title}
              </h2>
              <p className="text-xs text-offwhite/60">
                {featured.reviewedBy ?? featured.excerpt}
              </p>
            </div>
            <span className="label-micro shrink-0 rounded-sm bg-terracotta px-4 py-2.5 text-white">
              Read guide
            </span>
          </Link>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="label-micro mb-4 text-muted-foreground">Recently added</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((article) => (
              <Link
                key={article.slug}
                href={`/learn/${article.slug}`}
                className="flex flex-col gap-2 rounded-sm bg-white p-5 ring-1 ring-border transition-colors hover:ring-charcoal/30"
              >
                <span className="label-micro text-terracotta">{article.category}</span>
                <h3 className="text-sm font-medium leading-snug text-charcoal">
                  {article.title}
                </h3>
                <span className="text-[11px] text-muted-foreground">{article.readTime}</span>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No articles in this category yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
