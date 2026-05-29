"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTransferGoalFunds } from "~/hooks/use-goals";
import { toDateStr } from "~/lib/dates";

type GoalOption = { id: string; name: string; allocatedCents: number };

interface GoalTransferDialogProps {
  goals: GoalOption[];
}

export function GoalTransferDialog({ goals }: GoalTransferDialogProps) {
  const transferFunds = useTransferGoalFunds();
  const [open, setOpen] = useState(false);
  const [fromGoalId, setFromGoalId] = useState<string>("__untethered__");
  const [toGoalId, setToGoalId] = useState<string>("__untethered__");
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState(toDateStr(new Date()));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sourceGoal = useMemo(
    () => goals.find((g) => g.id === fromGoalId),
    [goals, fromGoalId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    const fromId = fromGoalId === "__untethered__" ? null : fromGoalId;
    const toId = toGoalId === "__untethered__" ? null : toGoalId;

    if (!fromId && !toId) {
      setError("Select at least a source or destination goal.");
      return;
    }

    if (fromId && toId && fromId === toId) {
      setError("Source and destination must be different.");
      return;
    }

    const cents = Math.round(amountNumber * 100);
    if (fromId) {
      const source = goals.find((g) => g.id === fromId);
      if (source && source.allocatedCents < cents) {
        setError("Source goal does not have enough allocated funds.");
        return;
      }
    }

    await transferFunds.mutateAsync({
      fromGoalId: fromId,
      toGoalId: toId,
      amountCents: cents,
      transferDate,
      notes: notes.trim() || undefined,
    });

    setAmount("");
    setNotes("");
    setFromGoalId("__untethered__");
    setToGoalId("__untethered__");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Transfer Funds</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Transfer / Reallocate Funds</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={fromGoalId} onValueChange={setFromGoalId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__untethered__">Left to Taper</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={toGoalId} onValueChange={setToGoalId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__untethered__">Left to Taper</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-transfer-amount">Amount</Label>
              <Input
                id="goal-transfer-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal-transfer-date">Date</Label>
              <Input
                id="goal-transfer-date"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-transfer-notes">Notes</Label>
            <Input
              id="goal-transfer-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={transferFunds.isPending || (fromGoalId === "__untethered__" && toGoalId === "__untethered__")}
          >
            {transferFunds.isPending ? "Transferring..." : "Submit Transfer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
