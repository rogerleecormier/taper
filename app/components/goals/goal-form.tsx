"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export type GoalFormData = {
  name: string;
  targetAmountCents: number;
  notes?: string;
};

interface GoalFormProps {
  defaultValues?: Partial<GoalFormData>;
  onSubmit: (data: GoalFormData) => Promise<void> | void;
  isLoading?: boolean;
}

export function GoalForm({ defaultValues, onSubmit, isLoading }: GoalFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    defaultValues?.targetAmountCents ? (defaultValues.targetAmountCents / 100).toFixed(2) : ""
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amount = Number(targetAmount);
    if (!name.trim()) {
      setError("Goal name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Target amount must be greater than 0.");
      return;
    }

    await onSubmit({
      name: name.trim(),
      targetAmountCents: Math.round(amount * 100),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Goal Name *</Label>
        <Input
          id="goal-name"
          type="text"
          placeholder="e.g. Emergency Fund"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-target">Target Amount *</Label>
        <Input
          id="goal-target"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="1000.00"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-notes">Notes</Label>
        <Input
          id="goal-notes"
          type="text"
          placeholder="Optional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Goal"}
      </Button>
    </form>
  );
}
