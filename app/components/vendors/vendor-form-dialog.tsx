"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { VendorForm, type VendorFormData } from "./vendor-form";
import { useCreateVendor, useUpdateVendor } from "~/hooks/use-vendors";

interface VendorFormDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<VendorFormData>;
  vendorId?: string;
  onSuccess?: () => void;
}

export function VendorFormDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultValues,
  vendorId,
  onSuccess,
}: VendorFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(val: boolean) {
    if (isControlled) controlledOnOpenChange?.(val);
    else setInternalOpen(val);
  }

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const isEditing = !!vendorId;
  const isLoading = createVendor.isPending || updateVendor.isPending;

  async function handleSubmit(data: VendorFormData) {
    if (isEditing) {
      await updateVendor.mutateAsync({
        id: vendorId,
        name: data.name,
        website: data.website || "",
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
    } else {
      await createVendor.mutateAsync({
        name: data.name,
        website: data.website || "",
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
    }
    setOpen(false);
    onSuccess?.();
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
      </DialogHeader>
      <VendorForm
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
