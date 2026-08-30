import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconArrowRight, IconSparkles, IconX } from "@tabler/icons-react";

import { AudienceToggle } from "@/components/learn/audience-toggle";
import { TopicGrid } from "@/components/learn/topic-grid";
import { StartHere } from "@/components/learn/start-here";
import { GuideGrid, type GuideGridItem } from "@/components/learn/guide-grid";
import { LearnCta } from "@/components/learn/learn-cta";
import { Icon } from "@/components/ui/icon";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";
import { LEARN_PATHS, getLearnPath } from "@/content/marketing/learn-paths";
import { readingLabel } from "@/lib/learning/reading";
import {
  getRealLearningArticles,
  getRealLearningCategories,
  getRealFeaturedLearningArticle,
  type LearningAudience,
  type RealLearningArticle,
} from "@/lib/learning/queries";

interface LearnPageProps {
  searchParams: Promise<{ category?: string; audience?: string; path?: string }>;
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const { category, audience: audienceParam, path: pathParam } = await searchParams;
  const audience: LearningAudience = audienceParam === "therapist" ? "therapist" : "parent";

  const [articles, realCategories, featured] = await Promise.all([
    getRealLearningArticles(audience),
    getRealLearningCategories(audience),
    getRealFeaturedLearningArticle(audience),
  ]);

  // The featured article is pulled into the hero, so it's excluded from the
  // grid and every count below -- otherwise the topic tiles and the grid's
  // own tally disagree.
  const pool = featured ? articles.filter((a) => a.slug !== featured.slug) : articles;

  const counts: Record<string, number> = {};
  for (const article of pool) {
    if (article.categoryName) counts[article.categoryName] = (counts[article.categoryName] ?? 0) + 1;
  }

  const pathCounts: Record<string, number> = {};
  for (const p of LEARN_PATHS) {
    pathCounts[p.slug] = pool.filter(
      (a) => a.categoryName && p.categories.includes(a.categoryName)
    ).length;
  }

  const activePath = audience === "parent" ? getLearnPath(pathParam) : undefined;
  const activeCategory = !activePath && category && category !== "All" ? category : undefined;
  const isFiltered = Boolean(activePath || activeCategory);

  let visible = pool;
  if (activePath) {
    visible = pool.filter((a) => a.categoryName && activePath.categories.includes(a.categoryName));
  } else if (activeCategory) {
    visible = pool.filter((a) => a.categoryName === activeCategory);
  }

  const guides: GuideGridItem[] = visible.map(toGuideItem);
  const clearHref = audience === "therapist" ? "/learn?audience=therapist" : "/learn";

  return (
    <div className="flex flex-col px-6 py-12 md:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <span className="eyebrow text-rust-dark">Learning Center</span>
        <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-charcoal md:text-4xl">
          {audience === "therapist"
            ? "Sharpen your practice, one focused read at a time."
            : "Understand what your child is going through, one clear answer at a time."}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          {audience === "therapist"
            ? "Practical guidance on assessment, documentation, and working with families on Hayven."
            : "Plain-language guides written with therapists. Start with what you’re noticing — not a diagnosis."}
        </p>

        <div className="mt-6 max-w-xs">
          <Suspense>
            <AudienceToggle active={audience} />
          </Suspense>
        </div>

        {/* Featured hero -- hidden while a filter is active so the page stays focused */}
        {featured && !isFiltered && <FeaturedHero article={featured} />}

        {/* Filter bar */}
        {isFiltered && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-soft">Showing</span>
            <span className="rounded-full bg-charcoal px-3 py-1 text-sm font-medium text-canvas-white">
              {activePath ? activePath.title : activeCategory}
            </span>
            <Link
              href={clearHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-rust-dark hover:underline"
            >
              <IconX size={14} stroke={2} />
              Clear
            </Link>
          </div>
        )}

        {/* Start here -- parent only, and only on the unfiltered index */}
        {audience === "parent" && !isFiltered && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-charcoal md:text-2xl">Start here</h2>
              <span className="text-xs text-ink-soft">pick what fits today</span>
            </div>
            <div className="mt-5">
              <StartHere counts={pathCounts} />
            </div>
          </section>
        )}

        {/* Browse by topic */}
        {realCategories.length > 0 && (
          <section className="mt-14">
            <h2 className="font-serif text-xl text-charcoal md:text-2xl">Browse by topic</h2>
            <div className="mt-5">
              <TopicGrid categories={realCategories} counts={counts} audience={audience} />
            </div>
          </section>
        )}

        {/* Guides */}
        <section className="mt-14">
          <h2 className="mb-5 font-serif text-xl text-charcoal md:text-2xl">
            {activePath ? `Guides for “${activePath.title}”` : activeCategory ? activeCategory : "All guides"}
          </h2>
          <GuideGrid guides={guides} />
        </section>

        {/* Closing CTA -- parent only */}
        {audience === "parent" && (
          <section className="mt-16">
            <LearnCta
              heading="Not sure what you're looking at?"
              body="Take the 2-minute matching quiz and we'll point you to the right guides and a therapist who fits."
              primary={{ href: "/needs-assessment", label: "Take the quiz" }}
              secondary={{ href: "/search", label: "Browse therapists" }}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function toGuideItem(article: RealLearningArticle): GuideGridItem {
  return {
    key: article.slug,
    href: `/learn/${article.slug}`,
    title: article.title,
    categoryName: article.categoryName,
    imageUrl: article.imageUrl,
    metaLabel: readingLabel(article.body, article.readTime),
    reviewed: Boolean(article.reviewedBy),
    searchText: `${article.title} ${article.excerpt}`.toLowerCase(),
  };
}

function FeaturedHero({ article }: { article: RealLearningArticle }) {
  const meta = article.categoryName ? LEARN_TOPIC_META[article.categoryName] : undefined;

  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group mt-10 grid overflow-hidden rounded-[1.25rem] bg-charcoal text-canvas-white shadow-[0_20px_60px_-15px_rgba(26,18,12,0.35)] md:grid-cols-[1.1fr_1fr]"
    >
      <div className="flex flex-col justify-between gap-6 p-8 md:p-10">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-canvas-white/90">
            <IconSparkles size={13} stroke={2} />
            Featured guide
          </span>
          <h2 className="font-serif text-2xl leading-snug md:text-[1.75rem]">{article.title}</h2>
          <p className="text-sm text-canvas-white/70">
            {article.reviewedBy ?? article.excerpt}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-canvas-white transition-all duration-200 ease-out group-hover:scale-[1.02] group-hover:bg-rust-dark">
          Read guide
          <IconArrowRight
            size={16}
            stroke={2}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </div>
      <div
        className="relative flex min-h-[200px] items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #b8734c 0%, #9c5934 45%, #7c4527 100%)" }}
      >
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="photo-treatment size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          meta && <Icon icon={meta.icon} size="lg" className="text-canvas-white/85" />
        )}
      </div>
    </Link>
  );
}
