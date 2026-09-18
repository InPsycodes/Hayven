import { LearningArticleForm } from "@/components/admin/learning-article-form";
import { getAllLearningCategoriesForAdmin } from "@/lib/learning/queries";

export default async function NewLearningArticlePage() {
  const categories = await getAllLearningCategoriesForAdmin();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">New article</h1>
        <p className="mt-1 text-sm text-muted-foreground">Saved as a draft -- publish it from the article list when it&apos;s ready.</p>
      </div>
      <div className="px-6 pb-8 md:px-8">
        <section className="max-w-2xl rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <LearningArticleForm categories={categories} />
        </section>
      </div>
    </div>
  );
}
