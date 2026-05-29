"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { GoalForm, type GoalFormData } from "./goal-form";
import { useCreateGoal, useUpdateGoal } from "~/hooks/use-goals";

interface GoalFormDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: Partial<GoalFormData>;
  goalId?: string;
  onSuccess?: () => void;
}

export function GoalFormDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultValues,
  goalId,
  onSuccess,
}: GoalFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  function setOpen(value: boolean) {
    if (isControlled) controlledOnOpenChange?.(value);
    else setInternalOpen(value);
  }

  async function handleSubmit(data: GoalFormData) {
    if (goalId) {
      await updateGoal.mutateAsync({
        id: goalId,
        name: data.name,
        targetAmountCents: data.targetAmountCents,
        notes: data.notes,
      });
    } else {
      await createGoal.mutateAsync(data);
    }
    setOpen(false);
    onSuccess?.();
  }

  const isLoading = createGoal.isPending || updateGoal.isPending;

  const content = (
    <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{goalId ? "Edit Goal" : "Add Goal"}</DialogTitle>
      </DialogHeader>
      <GoalForm defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={isLoading} />
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {content}
    </Dialog>
  );
}
