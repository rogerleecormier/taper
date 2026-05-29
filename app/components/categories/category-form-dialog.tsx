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
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<CategoryFormData>;
  categoryId?: string;
  onSuccess?: () => void;
}

export function CategoryFormDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultValues,
  categoryId,
  onSuccess,
}: CategoryFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  function setOpen(val: boolean) {
    if (isControlled) controlledOnOpenChange?.(val);
    else setInternalOpen(val);
  }

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

  const dialogContent = (
    <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
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
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
