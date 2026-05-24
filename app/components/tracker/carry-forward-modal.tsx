"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr, nextOccurrenceDate } from "~/lib/dates";
import {
  useCarryForwardOccurrence,
  useCarryForwardCreditOccurrence,
} from "~/hooks/use-occurrences";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";

type AnyOccurrence = BillOccurrence | CreditOccurrence;

interface CarryForwardModalProps {
  open: boolean;
  onClose: () => void;
  occurrence: AnyOccurrence;
  name: string;
  interval: string;
  type: "bill" | "credit";
  remaining: number;
}

export function CarryForwardModal({
  open,
  onClose,
  occurrence,
  name,
  interval,
  type,
  remaining,
}: CarryForwardModalProps) {
  const [carryAmount, setCarryAmount] = useState("");
  const [carryDate, setCarryDate] = useState(() =>
    nextOccurrenceDate(occurrence.dueDate, interval)
  );
  const [error, setError] = useState<string | null>(null);

  const carryForward = useCarryForwardOccurrence();
  const carryForwardCredit = useCarryForwardCreditOccurrence();

  const isBusy = carryForward.isPending || carryForwardCredit.isPending;

  async function handleCarryForward() {
    setError(null);
    try {
      const carryAmountCents = carryAmount.trim()
        ? Math.round(parseFloat(carryAmount) * 100)
        : undefined;

      if (!carryAmountCents || carryAmountCents <= 0) {
        setError("Please enter a valid carry amount.");
        return;
      }

      if (carryAmountCents > remaining) {
        setError(`Cannot carry more than ${formatCurrency(remaining)}.`);
        return;
      }

      if (type === "bill") {
        await carryForward.mutateAsync({
          id: occurrence.id,
          targetDate: carryDate,
          carryAmountCents,
        });
      } else {
        await carryForwardCredit.mutateAsync({
          id: occurrence.id,
          targetDate: carryDate,
          carryAmountCents,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to carry forward balance.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due</span>
                <span className="font-medium tabular-nums">{occurrence.dueDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t pt-1 mt-0.5">
                <span className="font-semibold">Balance remaining</span>
                <span className="font-bold tabular-nums text-amber-600">
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Carry Forward to Another Date
          </p>

          <div className="space-y-2">
            <Label htmlFor="carry-amount" className="text-xs">
              Amount to carry forward
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="carry-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining / 100}
                  className="pl-6 h-9 text-sm"
                  placeholder={formatCurrency(remaining)}
                  value={carryAmount}
                  onChange={(e) => setCarryAmount(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                / {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carry-date" className="text-xs">
              Target date
            </Label>
            <Input
              id="carry-date"
              type="date"
              className="h-9 text-sm"
              value={carryDate}
              onChange={(e) => setCarryDate(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            disabled={isBusy}
            onClick={handleCarryForward}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : null}
            Carry Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
