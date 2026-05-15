"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { CategoryForm, type CategoryFormData } from "./category-form";
import { useCreateCategory, useUpdateCategory } from "~/hooks/use-categories";

interface CategoryFormDialogProps {
  trigger: ReactNode;
  defaultValues?: Partial<CategoryFormData>;
  categoryId?: string;
  onSuccess?: () => void;
}

export function CategoryFormDialog({
  trigger,
  defaultValues,
  categoryId,
  onSuccess,
}: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = !!categoryId;
  const isLoading = createCategory.isPending || updateCategory.isPending;

  async function handleSubmit(data: CategoryFormData) {
    if (isEditing) {
      await updateCategory.mutateAsync({
        id: categoryId,
        name: data.name,
        type: data.type,
        color: data.color || undefined,
        icon: data.icon || undefined,
      });
    } else {
      await createCategory.mutateAsync({
        name: data.name,
        type: data.type,
        color: data.color || undefined,
        icon: data.icon || undefined,
      });
    }
    setOpen(false);
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <CategoryForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
