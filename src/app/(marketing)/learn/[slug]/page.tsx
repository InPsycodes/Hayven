import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { getRealLearningArticleBySlug } from "@/lib/learning/queries";
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
    openGraph: { title: article.title, description: article.excerpt, type: "article" },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getRealLearningArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-12 md:px-10">
      {/* Admin-authored content (see /admin/learning), not user input --
          still run through safeJsonLdStringify for consistency with the
          rest of this codebase's structured data. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(getArticleSchema(article)) }}
      />
      <Link
        href="/learn"
        className="mb-6 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft size={16} />
        Learning Center
      </Link>
      {article.categoryName && <span className="label-micro text-rust-dark">{article.categoryName}</span>}
      <h1 className="mt-3 font-heading text-3xl leading-tight text-charcoal">{article.title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">
        {article.readTime}
        {article.reviewedBy ? ` · ${article.reviewedBy}` : ""}
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {article.body.map((paragraph, i) => (
          <p key={i} className="text-base leading-relaxed text-charcoal">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
