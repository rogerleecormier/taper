"use client";

import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { IncomeForm, type IncomeFormData } from "./income-form";
import { useCreateIncomeSource, useUpdateIncomeSource } from "~/hooks/use-income";
import { useVendors } from "~/hooks/use-vendors";
import { useCategories } from "~/hooks/use-categories";

interface IncomeFormDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<IncomeFormData>;
  incomeSourceId?: string;
  onSuccess?: () => void;
}

type SourceType = "standard" | "payroll";

export function IncomeFormDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultValues,
  incomeSourceId,
  onSuccess,
}: IncomeFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<"pick-type" | "form">(
    incomeSourceId ? "form" : "pick-type"
  );
  const [sourceType, setSourceType] = useState<SourceType>("standard");
  const navigate = useNavigate();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(val: boolean) {
    if (isControlled) {
      controlledOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
    if (!val) {
      // Reset to type picker when closing (only for new sources)
      if (!incomeSourceId) {
        setTimeout(() => setStep("pick-type"), 200);
      }
    }
  }

  const { data: vendors = [] } = useVendors();
  const { data: categories = [] } = useCategories("income");

  const createIncomeSource = useCreateIncomeSource();
  const updateIncomeSource = useUpdateIncomeSource();

  const isEditing = !!incomeSourceId;
  const isLoading = createIncomeSource.isPending || updateIncomeSource.isPending;

  async function handleSubmit(data: IncomeFormData) {
    if (isEditing) {
      await updateIncomeSource.mutateAsync({ id: incomeSourceId, ...data });
      setOpen(false);
      onSuccess?.();
    } else {
      const result = await createIncomeSource.mutateAsync({
        ...data,
        sourceType,
      });
      setOpen(false);
      onSuccess?.();
      if (sourceType === "payroll" && result?.id) {
        navigate({ to: "/income/$id", params: { id: result.id } });
      }
    }
  }

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const categoryOptions = (categories as Array<{ id: string; name: string }>).map(
    (c) => ({ id: c.id, name: c.name })
  );

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {isEditing
            ? "Edit Income Source"
            : step === "pick-type"
              ? "Add Income Source"
              : sourceType === "payroll"
                ? "New Payroll Source"
                : "New Income Source"}
        </DialogTitle>
      </DialogHeader>

      {!isEditing && step === "pick-type" ? (
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Choose the type of income source you want to track.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSourceType("standard");
                setStep("form");
              }}
              className="flex flex-col items-start gap-2 rounded-lg border border-input p-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="text-2xl">💼</span>
              <div>
                <p className="font-semibold text-sm">Standard</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fixed or variable income with a set expected amount (rent, freelance, etc.)
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceType("payroll");
                setStep("form");
              }}
              className="flex flex-col items-start gap-2 rounded-lg border border-input p-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="text-2xl">🏦</span>
              <div>
                <p className="font-semibold text-sm">Payroll</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  W-2 employment income. Upload paystubs for AI-powered deduction tracking.
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
          {!isEditing && sourceType === "payroll" && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
              After saving, you can upload paystubs to track gross pay, net pay, and deductions automatically.
            </div>
          )}
          {!isEditing && (
            <button
              type="button"
              onClick={() => setStep("pick-type")}
              className="text-xs text-muted-foreground hover:text-foreground -mt-2"
            >
              ← Back to type selection
            </button>
          )}
          <IncomeForm
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            vendors={vendorOptions}
            categories={categoryOptions}
            isPayroll={!isEditing && sourceType === "payroll"}
          />
        </>
      )}
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
