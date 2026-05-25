"use client";

import { useState } from "react";
import { Loader2, Trash2, CornerDownRight, AlertCircle, CheckCircle2 } from "lucide-react";
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
  useBillPayments,
  useAddBillPayment,
  useDeleteBillPayment,
  useCarryForwardOccurrence,
} from "~/hooks/use-occurrences";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  occurrence: BillOccurrence;
  billName: string;
  interval: string;
}

export function PaymentModal({
  open,
  onClose,
  occurrence,
  billName,
  interval,
}: PaymentModalProps) {
  const today = toDateStr(new Date());

  const { data: payments = [], isLoading: paymentsLoading } = useBillPayments(
    open ? occurrence.id : null
  );

  const paidSoFar = payments.reduce((s, p) => s + p.amountCents, 0);
  const remaining = Math.max(0, occurrence.amountCents - paidSoFar);

  const [amount, setAmount] = useState(() => String(occurrence.amountCents / 100));
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastRecorded, setLastRecorded] = useState<number | null>(null);
  const [carryDate, setCarryDate] = useState(() =>
    nextOccurrenceDate(occurrence.dueDate, interval)
  );

  const addPayment = useAddBillPayment();
  const deletePayment = useDeleteBillPayment();
  const carryForward = useCarryForwardOccurrence();

  const isBusy =
    addPayment.isPending || deletePayment.isPending || carryForward.isPending;

  // Reset amount to current remaining whenever remaining changes
  const defaultAmount = remaining > 0 ? remaining : occurrence.amountCents;

  async function handleAddPayment() {
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    try {
      const selectedPaidDate = date;
      await addPayment.mutateAsync({
        occurrenceId: occurrence.id,
        amountCents: cents,
        paidDate: selectedPaidDate,
        notes: notes.trim() || undefined,
      });
      setLastRecorded(cents);
      setNotes("");
      // Preserve the selected date instead of forcing today's date after save.
      setDate(selectedPaidDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save payment. Please try again.");
    }
  }

  async function handleDelete(paymentId: string) {
    setError(null);
    try {
      await deletePayment.mutateAsync({ id: paymentId, occurrenceId: occurrence.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete payment.");
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
          <DialogTitle>{billName}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due</span>
                <span className="font-medium tabular-nums">{occurrence.dueDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(occurrence.amountCents)}
                </span>
              </div>
              {paidSoFar > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid so far</span>
                  <span className="font-medium tabular-nums text-success">
                    {formatCurrency(paidSoFar)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm border-t pt-1 mt-0.5">
                <span className="font-semibold">Balance remaining</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    remaining === 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Existing payments */}
        {paymentsLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading payments…
          </div>
        ) : payments.length > 0 ? (
          <div className="rounded-md border divide-y text-sm">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/10"
              >
                <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="w-24 flex-shrink-0 tabular-nums text-muted-foreground">
                  {p.paidDate}
                </span>
                <span className="flex-1 font-medium tabular-nums text-success">
                  {formatCurrency(p.amountCents)}
                </span>
                {p.notes && (
                  <span className="truncate text-xs text-muted-foreground max-w-[100px]">
                    {p.notes}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isBusy}
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add payment form */}
        {remaining > 0 && lastRecorded === null && (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Record Payment
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pay-amount" className="text-xs">
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="pay-amount"
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
                <Label htmlFor="pay-date" className="text-xs">
                  Date
                </Label>
                <Input
                  id="pay-date"
                  type="date"
                  className="h-9 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-notes" className="text-xs">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="pay-notes"
                className="h-9 text-sm"
                placeholder="e.g. check #1234"
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
        {occurrence.status !== "skipped" && occurrence.status !== "carried" && remaining > 0 && lastRecorded === null && (
          <div className="rounded-md border border-dashed border-warning/30 bg-warning/10 px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-warning">
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
                className="h-8 text-xs border-warning/40 text-warning hover:bg-warning/15 flex-shrink-0"
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

        {lastRecorded !== null && remaining === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/10 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Payment recorded. Bill is fully paid!</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-success/40 text-success hover:bg-success/15 flex-shrink-0" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {lastRecorded !== null && remaining > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/10 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                {formatCurrency(lastRecorded)} recorded. Record another payment?
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-success/40 text-success hover:bg-success/15"
                onClick={() => {
                  setLastRecorded(null);
                  setAmount(String(remaining / 100));
                }}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={onClose}
              >
                No, close
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isBusy}>
            {remaining === 0 ? "Close" : "Cancel"}
          </Button>
          {remaining > 0 && lastRecorded === null && (
            <Button
              size="sm"
              disabled={isBusy}
              onClick={handleAddPayment}
            >
              {addPayment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Record Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
