import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useCategories } from "~/hooks/use-categories";
import { CategoryList } from "~/components/categories/category-list";
import { CategoryFormDialog } from "~/components/categories/category-form-dialog";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/categories/")({
  component: CategoriesPage,
  head: () => ({
    meta: [
      {
        title: "Categories - Taper",
      },
      {
        name: "description",
        content: "Organize your expenses and income into categories",
      },
    ],
  }),
});

function CategoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: categories, isLoading, isError } = useCategories();

  return (
    <div className="entity-page">
      <div className="entity-header">
        <div>
          <h1 className="entity-title">Categories</h1>
          <p className="entity-subtitle">
            Organize your expenses and income into categories
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 sm:self-center">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/30 bg-danger/5 py-16 text-center">
          <p className="text-sm text-danger font-medium">Failed to load categories. Please try again.</p>
        </div>
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
