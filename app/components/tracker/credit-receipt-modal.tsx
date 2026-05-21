"use client";

import { useState } from "react";
import { Loader2, Trash2, CornerDownRight, AlertCircle } from "lucide-react";
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
  useCreditReceipts,
  useAddCreditReceipt,
  useDeleteCreditReceipt,
  useCarryForwardCreditOccurrence,
} from "~/hooks/use-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";

interface CreditReceiptModalProps {
  open: boolean;
  onClose: () => void;
  occurrence: CreditOccurrence;
  creditName: string;
  interval: string;
}

export function CreditReceiptModal({
  open,
  onClose,
  occurrence,
  creditName,
  interval,
}: CreditReceiptModalProps) {
  const today = toDateStr(new Date());

  const { data: receipts = [], isLoading: receiptsLoading } = useCreditReceipts(
    open ? occurrence.id : null
  );

  const receivedSoFar = receipts.reduce((s, r) => s + r.amountCents, 0);
  const remaining = Math.max(0, occurrence.amountCents - receivedSoFar);

  const [amount, setAmount] = useState(() => String(occurrence.amountCents / 100));
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [carryDate, setCarryDate] = useState(() =>
    nextOccurrenceDate(occurrence.dueDate, interval)
  );

  const addReceipt = useAddCreditReceipt();
  const deleteReceipt = useDeleteCreditReceipt();
  const carryForward = useCarryForwardCreditOccurrence();

  const isBusy =
    addReceipt.isPending || deleteReceipt.isPending || carryForward.isPending;

  const defaultAmount = remaining > 0 ? remaining : occurrence.amountCents;

  async function handleAddReceipt() {
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    try {
      await addReceipt.mutateAsync({
        occurrenceId: occurrence.id,
        amountCents: cents,
        receivedDate: date,
        notes: notes.trim() || undefined,
      });
      setAmount(String(Math.max(0, remaining - cents) / 100 || 0));
      setNotes("");
      setDate(today);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save receipt. Please try again.");
    }
  }

  async function handleDelete(receiptId: string) {
    setError(null);
    try {
      await deleteReceipt.mutateAsync({ id: receiptId, occurrenceId: occurrence.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete receipt.");
    }
  }

  async function handleCarryForward() {
    setError(null);
    try {
      await carryForward.mutateAsync({ id: occurrence.id, targetDate: carryDate });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to carry forward balance.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{creditName}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due</span>
                <span className="font-medium tabular-nums">{occurrence.dueDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Credit Amount</span>
                <span className="font-medium tabular-nums text-teal-700">
                  {formatCurrency(occurrence.amountCents)}
                </span>
              </div>
              {receivedSoFar > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Received so far</span>
                  <span className="font-medium tabular-nums text-teal-700">
                    {formatCurrency(receivedSoFar)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm border-t pt-1 mt-0.5">
                <span className="font-semibold">Balance remaining</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    remaining === 0 ? "text-teal-600" : "text-amber-600"
                  )}
                >
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Existing receipts */}
        {receiptsLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading receipts…
          </div>
        ) : receipts.length > 0 ? (
          <div className="rounded-md border divide-y text-sm">
            {receipts.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/10"
              >
                <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="w-24 flex-shrink-0 tabular-nums text-muted-foreground">
                  {r.receivedDate}
                </span>
                <span className="flex-1 font-medium tabular-nums text-teal-700">
                  {formatCurrency(r.amountCents)}
                </span>
                {r.notes && (
                  <span className="truncate text-xs text-muted-foreground max-w-[100px]">
                    {r.notes}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isBusy}
                  onClick={() => handleDelete(r.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add receipt form */}
        {remaining > 0 && (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Record Receipt
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="receipt-amount" className="text-xs">
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="receipt-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="pl-6 h-9 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onFocus={() => {
                      if (amount === "0") setAmount(String(defaultAmount / 100));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="receipt-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="receipt-date"
                  type="date"
                  className="h-9 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="receipt-notes" className="text-xs">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="receipt-notes"
                className="h-9 text-sm"
                placeholder="e.g. check deposit"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Carry-forward section */}
        {occurrence.status !== "skipped" && occurrence.status !== "carried" && remaining > 0 && (
          <div className="rounded-md border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-amber-800">
              Carry forward {formatCurrency(remaining)} to another date
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-8 text-xs flex-1"
                value={carryDate}
                onChange={(e) => setCarryDate(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0"
                disabled={isBusy}
                onClick={handleCarryForward}
              >
                {carryForward.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Carry Forward
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isBusy}>
            {remaining === 0 ? "Close" : "Cancel"}
          </Button>
          {remaining > 0 && (
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isBusy}
              onClick={handleAddReceipt}
            >
              {addReceipt.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Record Receipt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
