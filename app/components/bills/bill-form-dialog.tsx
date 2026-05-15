"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { BillForm, type BillFormData } from "./bill-form";
import { useCreateBill, useUpdateBill } from "~/hooks/use-bills";
import { useVendors } from "~/hooks/use-vendors";
import { useCategories } from "~/hooks/use-categories";

interface BillFormDialogProps {
  trigger: ReactNode;
  defaultValues?: Partial<BillFormData>;
  billId?: string;
  onSuccess?: () => void;
}

export function BillFormDialog({
  trigger,
  defaultValues,
  billId,
  onSuccess,
}: BillFormDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories("expense");

  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const isEditing = !!billId;
  const isLoading = createBill.isPending || updateBill.isPending;

  async function handleSubmit(data: BillFormData) {
    if (isEditing) {
      await updateBill.mutateAsync({ id: billId, ...data });
    } else {
      await createBill.mutateAsync(data);
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
          <DialogTitle>{isEditing ? "Edit Bill" : "Add Bill"}</DialogTitle>
        </DialogHeader>
        <BillForm
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
