"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { CreditForm, type CreditFormData } from "./credit-form";
import { useCreateCredit, useUpdateCredit } from "~/hooks/use-credits";
import { useVendors } from "~/hooks/use-vendors";
import { useCategories } from "~/hooks/use-categories";

interface CreditFormDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<CreditFormData>;
  creditId?: string;
  onSuccess?: () => void;
}

export function CreditFormDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultValues,
  creditId,
  onSuccess,
}: CreditFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(val: boolean) {
    if (isControlled) controlledOnOpenChange?.(val);
    else setInternalOpen(val);
  }

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories("income");

  const createCredit = useCreateCredit();
  const updateCredit = useUpdateCredit();

  const isEditing = !!creditId;
  const isLoading = createCredit.isPending || updateCredit.isPending;

  async function handleSubmit(data: CreditFormData) {
    if (isEditing) {
      await updateCredit.mutateAsync({ id: creditId, ...data });
    } else {
      await createCredit.mutateAsync(data);
    }
    setOpen(false);
    onSuccess?.();
  }

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const categoryOptions = (categories as Array<{ id: string; name: string }>).map(
    (c) => ({ id: c.id, name: c.name })
  );

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Credit" : "Add Credit"}</DialogTitle>
      </DialogHeader>
      <CreditForm
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
