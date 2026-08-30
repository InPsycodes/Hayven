import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LearningArticlesList } from "@/components/admin/learning-articles-list";
import { LearningCategoryManager } from "@/components/admin/learning-category-manager";
import { getAllLearningArticlesForAdmin, getAllLearningCategoriesForAdmin } from "@/lib/learning/queries";

export default async function AdminLearningPage() {
  const [articles, categories] = await Promise.all([getAllLearningArticlesForAdmin(), getAllLearningCategoriesForAdmin()]);

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6 md:p-8">
        <div>
          <h1 className="font-heading text-xl text-charcoal">Learning Center content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, and publish articles for the parent and therapist Learning Centers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/admin/learning/courses">Courses</Link>
          </Button>
          <Button asChild variant="accent">
            <Link href="/admin/learning/new">New article</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] md:p-6">
          <h2 className="label-micro text-rust-dark">Categories</h2>
          <div className="mt-5">
            <LearningCategoryManager categories={categories} />
          </div>
        </section>

        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.05),0_14px_34px_-22px_rgba(26,26,26,.3)] md:p-6">
          <h2 className="label-micro text-rust-dark">Articles ({articles.length})</h2>
          <div className="mt-5">
            <LearningArticlesList articles={articles} />
          </div>
        </section>
      </div>
    </div>
  );
}
