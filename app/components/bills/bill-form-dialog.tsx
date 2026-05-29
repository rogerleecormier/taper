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
import { AlertCircle } from "lucide-react";

interface BillFormDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<BillFormData>;
  billId?: string;
  onSuccess?: () => void;
}

export function BillFormDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultValues,
  billId,
  onSuccess,
}: BillFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(val: boolean) {
    if (isControlled) controlledOnOpenChange?.(val);
    else setInternalOpen(val);
  }

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories("expense");

  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const isEditing = !!billId;
  const isLoading = createBill.isPending || updateBill.isPending;
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(data: BillFormData) {
    setSubmitError(null);
    try {
      if (isEditing) {
        await updateBill.mutateAsync({ id: billId, ...data });
      } else {
        await createBill.mutateAsync(data);
      }
      setOpen(false);
      onSuccess?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    }
  }

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const categoryOptions = (categories as Array<{ id: string; name: string }>).map(
    (c) => ({ id: c.id, name: c.name })
  );

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
      </DialogHeader>
      {submitError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}
      <BillForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        vendors={vendorOptions}
        categories={categoryOptions}
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
