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
        className="mb-6 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft size={16} />
        Learning Center
      </Link>
      <span className="label-micro text-rust-dark">{article.category}</span>
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
