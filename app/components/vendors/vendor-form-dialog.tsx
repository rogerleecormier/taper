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
  trigger: ReactNode;
  defaultValues?: Partial<VendorFormData>;
  vendorId?: string;
  onSuccess?: () => void;
}

export function VendorFormDialog({
  trigger,
  defaultValues,
  vendorId,
  onSuccess,
}: VendorFormDialogProps) {
  const [open, setOpen] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>
        <VendorForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
