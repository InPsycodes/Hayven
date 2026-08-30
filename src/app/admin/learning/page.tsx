import { LearningAdminHeader } from "@/components/admin/learning-admin-header";
import { LearningArticlesList } from "@/components/admin/learning-articles-list";
import { getAllLearningArticlesForAdmin } from "@/lib/learning/queries";

export default async function AdminLearningPage() {
  const articles = await getAllLearningArticlesForAdmin();

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <LearningAdminHeader active="articles" action={{ label: "New article", href: "/admin/learning/new" }} />

      <div className="px-6 py-6 md:px-8">
        <LearningArticlesList articles={articles} />
      </div>
    </div>
  );
}
