"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { IncomeForm, type IncomeFormData } from "./income-form";
import { useCreateIncomeSource, useUpdateIncomeSource } from "~/hooks/use-income";
import { useVendors } from "~/hooks/use-vendors";
import { useCategories } from "~/hooks/use-categories";

interface IncomeFormDialogProps {
  trigger: ReactNode;
  defaultValues?: Partial<IncomeFormData>;
  incomeSourceId?: string;
  onSuccess?: () => void;
}

export function IncomeFormDialog({
  trigger,
  defaultValues,
  incomeSourceId,
  onSuccess,
}: IncomeFormDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories("income");

  const createIncomeSource = useCreateIncomeSource();
  const updateIncomeSource = useUpdateIncomeSource();

  const isEditing = !!incomeSourceId;
  const isLoading = createIncomeSource.isPending || updateIncomeSource.isPending;

  async function handleSubmit(data: IncomeFormData) {
    if (isEditing) {
      await updateIncomeSource.mutateAsync({ id: incomeSourceId, ...data });
    } else {
      await createIncomeSource.mutateAsync(data);
    }
    setOpen(false);
    onSuccess?.();
  }

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const categoryOptions = (categories as Array<{ id: string; name: string }>).map(
    (c) => ({ id: c.id, name: c.name })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Income Source" : "Add Income Source"}
          </DialogTitle>
        </DialogHeader>
        <IncomeForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          vendors={vendorOptions}
          categories={categoryOptions}
        />
      </DialogContent>
    </Dialog>
  );
}
