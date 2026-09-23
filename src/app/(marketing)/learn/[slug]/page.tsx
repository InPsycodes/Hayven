import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { IconArrowLeft, IconCircleCheck, IconClock } from "@tabler/icons-react";

import { GuideCard } from "@/components/learn/guide-card";
import { LearnCta } from "@/components/learn/learn-cta";
import { ReadingProgress } from "@/components/learn/reading-progress";
import { readingLabel } from "@/lib/learning/reading";
import {
  getRealLearningArticleBySlug,
  getRelatedLearningArticles,
} from "@/lib/learning/queries";
import { getArticleSchema } from "@/lib/seo/article-schema";
import { safeJsonLdStringify } from "@/lib/seo/json-ld";
import { canonicalFor } from "@/lib/seo/metadata";
import { getBreadcrumbSchema } from "@/lib/seo/breadcrumb-schema";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getRealLearningArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.excerpt,
    alternates: canonicalFor(`/learn/${slug}`),
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      ...(article.imageUrl ? { images: [{ url: article.imageUrl }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getRealLearningArticleBySlug(slug);
  if (!article) notFound();

  const related = await getRelatedLearningArticles(article);
  const readTime = readingLabel(article.body, article.readTime);
  const [lead, ...rest] = article.body;
  const isTherapist = article.audience === "therapist";
  const backHref = isTherapist ? "/learn?audience=therapist" : "/learn";

  return (
    <article className="bg-canvas-white">
      <ReadingProgress />
      {/* Admin-authored content (see /admin/learning), not user input --
          still run through safeJsonLdStringify for consistency with the
          rest of this codebase's structured data. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(getArticleSchema(article)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(
            getBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Learning Center", path: "/learn" },
              { name: article.title, path: `/learn/${article.slug}` },
            ])
          ),
        }}
      />

      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-[#6b3f26] text-canvas-white">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(135deg, #a5622f 0%, #8a4d2b 45%, #5f3a23 100%)" }}
        />
        {article.imageUrl && (
          <Image
            src={article.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="photo-treatment -z-10 object-cover opacity-55"
          />
        )}
        <div className="mx-auto max-w-[1200px] px-6 pt-8 pb-10 md:px-10 md:pt-10 md:pb-12 lg:px-12 lg:pt-14 lg:pb-16 xl:px-16">
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-canvas-white/75 hover:text-canvas-white"
          >
            <IconArrowLeft size={16} />
            Learning Center
          </Link>
          {article.categoryName && (
            <span className="label-micro block text-canvas-white/70">{article.categoryName}</span>
          )}
          <h1 className="mt-3 max-w-2xl font-serif text-[1.7rem] leading-tight sm:text-3xl md:text-[2.5rem]">
            {article.title}
          </h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-canvas-white/75">
            <span className="flex items-center gap-1.5">
              <IconClock size={13} stroke={1.75} />
              {readTime}
            </span>
            {article.reviewedBy && (
              <span className="flex items-center gap-1.5">
                <IconCircleCheck size={13} stroke={1.75} />
                {article.reviewedBy}
              </span>
            )}
          </p>
        </div>
      </header>

      {/* Body -- a wide editorial container (max ~1200px) holding a fixed-width
          reading column (max 680-720px, capped independently of its 1fr grid
          track so it never stretches on large monitors) beside a narrower
          sidebar. Below lg, the grid collapses to one column and the aside
          (already second in DOM order) naturally falls below the article --
          no separate mobile markup needed. */}
      <div className="mx-auto max-w-[1200px] px-6 py-12 md:px-10 md:py-14 lg:px-12 lg:py-16 xl:px-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-14 xl:grid-cols-[1fr_300px] xl:gap-20">
          <div className="min-w-0 lg:max-w-[680px] xl:max-w-[720px]">
            {lead && (
              <p className="font-serif text-xl leading-[1.55] text-charcoal md:text-[1.35rem]">{lead}</p>
            )}
            <div className="mt-6 flex flex-col gap-5 md:mt-8 md:gap-6">
              {rest.map((paragraph, i) => (
                <p key={i} className="text-base leading-[1.75] text-ink-soft md:text-[1.0625rem]">
                  {paragraph}
                </p>
              ))}
            </div>

            <p className="mt-12 border-t border-border pt-6 text-xs text-ink-soft/80">
              This guide is general information, not a diagnosis or medical advice. If you&apos;re
              worried about your child, the next step is a conversation with a qualified therapist.
            </p>
          </div>

          {/* An editorial "spine" (a colored rule, not a boxed card) rather
              than the previous rounded/ring/shadow treatment -- reads as
              part of the article's own design instead of a dashboard widget
              dropped beside it. */}
          <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
            <div className="border-l-2 border-terracotta/40 pl-6">
              <p className="label-micro text-rust-dark">In short</p>
              <p className="mt-3 font-serif text-[1.05rem] leading-[1.55] text-charcoal">
                {article.excerpt}
              </p>
            </div>

            {article.reviewedBy && (
              <div className="flex items-start gap-3 border-l-2 border-charcoal/10 pl-6">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-text">
                  <IconCircleCheck size={16} stroke={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-charcoal">Clinically reviewed</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{article.reviewedBy}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Related + CTA -- same wide container as the body above, so the
          whole page reads as one composition rather than the body being an
          island at a different width than everything around it. */}
      <div className="mx-auto max-w-[1200px] px-6 pb-16 md:px-10 lg:px-12 xl:px-16">
        {related.length > 0 && (
          <section className="mb-10">
            <p className="label-micro mb-4 text-ink-soft">Keep reading</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <GuideCard
                  key={item.slug}
                  compact
                  guide={{
                    href: `/learn/${item.slug}`,
                    title: item.title,
                    categoryName: item.categoryName,
                    imageUrl: item.imageUrl,
                    metaLabel: readingLabel(item.body, item.readTime),
                    reviewed: Boolean(item.reviewedBy),
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {isTherapist ? (
          <LearnCta
            tone="dark"
            heading="More for your practice"
            body="Structured courses with completion tracking live in your therapist dashboard."
            primary={{ href: "/therapist/learn", label: "Open the course library" }}
            secondary={{ href: "/learn?audience=therapist", label: "More guides" }}
          />
        ) : (
          <LearnCta
            tone="dark"
            heading="Ready to have someone look with you?"
            body="Book a verified therapist in Lagos, or take the 2-minute matching quiz to find the right fit."
            primary={{ href: "/search", label: "Find a therapist" }}
            secondary={{ href: "/needs-assessment", label: "Take the quiz" }}
          />
        )}
      </div>
    </article>
  );
}
