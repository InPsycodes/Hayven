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
    <article>
      <ReadingProgress />
      {/* Admin-authored content (see /admin/learning), not user input --
          still run through safeJsonLdStringify for consistency with the
          rest of this codebase's structured data. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(getArticleSchema(article)) }}
      />

      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-charcoal text-canvas-white">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(135deg, #9c5934 0%, #7c4527 38%, #1a1a1a 100%)" }}
        />
        {article.imageUrl && (
          <Image
            src={article.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="photo-treatment -z-10 object-cover opacity-40"
          />
        )}
        <div className="mx-auto max-w-3xl px-6 pt-10 pb-14 md:px-10 md:pt-12 md:pb-16">
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
          <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight md:text-[2.5rem]">
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

      {/* Body */}
      <div className="mx-auto grid max-w-4xl gap-10 px-6 py-12 md:grid-cols-[1fr_260px] md:px-10">
        <div className="min-w-0">
          {lead && (
            <p className="text-lg leading-relaxed text-charcoal">{lead}</p>
          )}
          <div className="mt-5 flex flex-col gap-4">
            {rest.map((paragraph, i) => (
              <p key={i} className="text-base leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </div>

          <p className="mt-10 border-t border-border pt-5 text-xs text-ink-soft/80">
            This guide is general information, not a diagnosis or medical advice. If you&apos;re
            worried about your child, the next step is a conversation with a qualified therapist.
          </p>
        </div>

        <aside className="flex flex-col gap-5 md:sticky md:top-6 md:self-start">
          <div className="rounded-2xl bg-canvas-white p-5 ring-1 ring-charcoal/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rust-dark">
              In short
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{article.excerpt}</p>
          </div>

          {article.reviewedBy && (
            <div className="rounded-2xl bg-paper/60 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success-text">
                  <IconCircleCheck size={18} stroke={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-charcoal">Clinically reviewed</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{article.reviewedBy}</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Related + CTA */}
      <div className="mx-auto max-w-4xl px-6 pb-16 md:px-10">
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
