import { LearningAdminHeader } from "@/components/admin/learning-admin-header";
import { LearningCategoryManager } from "@/components/admin/learning-category-manager";
import { getAllLearningCategoriesForAdmin } from "@/lib/learning/queries";

export default async function AdminLearningCategoriesPage() {
  const categories = await getAllLearningCategoriesForAdmin();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <LearningAdminHeader active="categories" />

      <div className="px-6 py-6 md:px-8">
        <p className="mb-5 text-sm text-muted-foreground">
          Categories group guides on <span className="font-mono text-xs">/learn</span> and carry the icon and
          colour tint shown on each card. Removing one leaves its articles uncategorised.
        </p>
        <LearningCategoryManager categories={categories} />
      </div>
    </div>
  );
}
