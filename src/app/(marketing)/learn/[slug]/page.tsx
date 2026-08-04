import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { getArticleBySlug } from "@/data/articles";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-12 md:px-10">
      <Link
        href="/learn"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft size={16} />
        Learning Center
      </Link>
      <span className="label-micro text-terracotta">{article.category}</span>
      <h1 className="mt-3 font-heading text-3xl leading-tight text-charcoal">{article.title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">
        {article.readTime}
        {article.reviewedBy ? ` · ${article.reviewedBy}` : ""}
      </p>
      <p className="mt-8 text-base leading-relaxed text-charcoal">{article.excerpt}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        This is placeholder editorial content for the Hayven Learning Center demo. In
        production, this guide would be written and reviewed by a licensed specialist before
        publishing.
      </p>
    </article>
  );
}
