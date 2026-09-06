import { notFound } from "next/navigation";

import { LearningArticleForm } from "@/components/admin/learning-article-form";
import { getLearningArticleByIdForAdmin, getAllLearningCategoriesForAdmin } from "@/lib/learning/queries";

export default async function EditLearningArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, categories] = await Promise.all([getLearningArticleByIdForAdmin(id), getAllLearningCategoriesForAdmin()]);
  if (!article) notFound();

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Edit article</h1>
        <p className="mt-1 text-sm text-muted-foreground">/learn/{article.slug}</p>
      </div>
      <div className="px-6 pb-8 md:px-8">
        <section className="max-w-2xl rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <LearningArticleForm article={article} categories={categories} />
        </section>
      </div>
    </div>
  );
}
