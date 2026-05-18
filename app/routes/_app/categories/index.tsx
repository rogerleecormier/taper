import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useCategories } from "~/hooks/use-categories";
import { CategoryList } from "~/components/categories/category-list";
import { CategoryFormDialog } from "~/components/categories/category-form-dialog";

export const Route = createFileRoute("/_app/categories/")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: categories, isLoading, isError } = useCategories();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your expenses and income into categories
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}

      {isError && (
        <p className="text-sm text-red-500">
          Failed to load categories. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <CategoryList categories={categories ?? []} />
      )}

      <CategoryFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
