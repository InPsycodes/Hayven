import { Suspense } from "react";
import Link from "next/link";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";

import { AudienceToggle } from "@/components/learn/audience-toggle";
import { TopicList } from "@/components/learn/topic-list";
import { ArticleGrid } from "@/components/learn/article-grid";
import { Icon } from "@/components/ui/icon";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";
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

  // Counts reflect what actually appears in the list below (the featured
  // article is pulled out into the hero, so it's excluded here too --
  // otherwise "All guides" and the list's own count would disagree.
  const audienceArticles = getArticlesForAudience(audience).filter((a) => a.slug !== featured.slug);
  const counts: Record<string, number> = {};
  for (const article of audienceArticles) {
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }

  const filtered = audienceArticles.filter(
    (a) => !category || category === "All" || a.category === category
  );

  const featuredMeta = LEARN_TOPIC_META[featured.category];

  return (
    <div className="flex flex-col px-6 py-12 md:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <span className="eyebrow text-rust-dark">Learning Center</span>
        <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight text-charcoal md:text-4xl">
          Understand what your child is going through, one clear answer at a time.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          Plain-language guides written with therapists. Start with what you&apos;re noticing, not a
          diagnosis.
        </p>

        <Link
          href={`/learn/${featured.slug}`}
          className="group mt-8 flex flex-col justify-between gap-6 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-charcoal to-rust-dark p-8 text-canvas-white shadow-[0_20px_60px_-15px_rgba(26,18,12,0.35)] md:flex-row md:items-center md:p-10"
        >
          <div className="flex flex-col gap-3 md:max-w-lg">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-canvas-white/90">
              <IconSparkles size={13} stroke={2} />
              Featured guide
            </span>
            <h2 className="font-serif text-2xl leading-snug md:text-[1.75rem]">{featured.title}</h2>
            <p className="text-sm text-canvas-white/70">{featured.reviewedBy ?? featured.excerpt}</p>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            {featuredMeta && (
              <span className="hidden size-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-canvas-white/80 sm:flex">
                <Icon icon={featuredMeta.icon} size="lg" />
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-canvas-white transition-all duration-200 ease-out group-hover:scale-[1.02] group-hover:bg-rust-dark">
              Read guide
              <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        <div className="mt-12 grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <Suspense>
              <AudienceToggle active={audience} />
            </Suspense>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Browse by topic
              </p>
              <Suspense>
                <TopicList categories={categories} counts={counts} total={audienceArticles.length} />
              </Suspense>
            </div>

            <div className="rounded-[1.25rem] border border-terracotta/25 bg-terracotta/8 p-5">
              <h3 className="font-serif text-base text-charcoal">Not sure where to start?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                Take our 2-minute quiz and we&apos;ll point you to the right guides and therapists.
              </p>
              <Link
                href="/needs-assessment"
                className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-rust-dark"
              >
                Take the quiz
                <IconArrowRight size={14} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </aside>

          <div className="min-w-0">
            <ArticleGrid articles={filtered} />
          </div>
        </div>
      </div>
    </div>
  );
}
