"use client";

import { useState } from "react";
import {
  Loader2,
  Trash2,
  CornerDownRight,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Pencil,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  useReverseCarryForward,
} from "~/hooks/use-occurrences";

export interface OccurrenceModalItem {
  occurrenceId: string;
  billId: string;
  billName: string;
  /** Interval string — loosely typed to accept DB strings */
  billInterval: string;
  dueDate: string;
  amountCents: number;
  paidAmountCents: number | null;
  status: string;
  notes: string | null;
  carriedFromId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  /** The first due date in the carry-forward chain, if this was carried */
  originalDueDate?: string | null;
}

interface OccurrenceDetailModalProps {
  item: OccurrenceModalItem | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "border-success/20 bg-success/10 text-success",
  partial: "border-warning/20 bg-warning/10 text-warning",
  pending: "border-border bg-muted/50 text-muted-foreground",
  overdue: "border-danger/20 bg-danger/10 text-danger",
  skipped: "border-border bg-muted/50 text-muted-foreground",
  carried: "border-accent/20 bg-accent/10 text-accent",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  overdue: "Overdue",
  skipped: "Skipped",
  carried: "Carried",
};

export function OccurrenceDetailModal({ item, open, onClose }: OccurrenceDetailModalProps) {
  const today = toDateStr(new Date());

  const { data: payments = [], isLoading: paymentsLoading } = useBillPayments(
    open && item ? item.occurrenceId : null
  );

  const paidSoFar = payments.reduce((s, p) => s + p.amountCents, 0);
  const remaining = item ? Math.max(0, item.amountCents - paidSoFar) : 0;

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [carryMode, setCarryMode] = useState(false);
  const [carryDate, setCarryDate] = useState(() =>
    item ? nextOccurrenceDate(item.dueDate, item.billInterval) : today
  );

  const addPayment = useAddBillPayment();
  const deletePayment = useDeleteBillPayment();
  const carryForward = useCarryForwardOccurrence();
  const reverseCarry = useReverseCarryForward();

  const isBusy = addPayment.isPending || deletePayment.isPending || carryForward.isPending || reverseCarry.isPending;

  function handleClose() {
    setCarryMode(false);
    setError(null);
    setAmount("");
    setNotes("");
    setDate(today);
    onClose();
  }

  async function handleAddPayment() {
    if (!item) return;
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    try {
      await addPayment.mutateAsync({
        occurrenceId: item.occurrenceId,
        amountCents: cents,
        paidDate: date,
        notes: notes.trim() || undefined,
      });
      setAmount("");
      setNotes("");
      setDate(today);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save payment.");
    }
  }

  async function handleCarryForward() {
    if (!item) return;
    setError(null);
    try {
      await carryForward.mutateAsync({ id: item.occurrenceId, targetDate: carryDate });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to carry forward.");
    }
  }

  async function handleReverseCarry() {
    if (!item) return;
    setError(null);
    try {
      await reverseCarry.mutateAsync(item.occurrenceId);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reverse carry forward.");
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!item) return;
    setError(null);
    try {
      await deletePayment.mutateAsync({ id: paymentId, occurrenceId: item.occurrenceId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete payment.");
    }
  }

  if (!item) return null;

  const isCarried = item.status === "carried";
  const isSkipped = item.status === "skipped";
  const isPaid = item.status === "paid";
  const canPay = !isCarried && !isSkipped;
  const canCarry = !isPaid && !isSkipped && !isCarried && remaining > 0 && !carryMode;
  const canUndoCarry = !!item.carriedFromId && paidSoFar === 0;

  const originalDate = item.originalDueDate && item.originalDueDate !== item.dueDate
    ? item.originalDueDate
    : null;

  const daysDeferred = originalDate
    ? differenceInDays(parseISO(item.dueDate), parseISO(originalDate))
    : null;

  const defaultPayAmount = remaining > 0 ? String(remaining / 100) : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{item.billName}</span>
            <Link
              to="/bills/$id"
              params={{ id: item.billId }}
              className="text-muted-foreground hover:text-accent transition-colors"
              onClick={handleClose}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </DialogTitle>
        </DialogHeader>

        {/* Meta */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[item.status] ?? STATUS_STYLES.pending)}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Due</span>
            <span className="font-medium tabular-nums flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {format(parseISO(item.dueDate), "MMM d, yyyy")}
            </span>
          </div>
          {originalDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Originally due
              </span>
              <span className="font-medium tabular-nums text-warning">
                {format(parseISO(originalDate), "MMM d, yyyy")}
                {daysDeferred !== null && daysDeferred > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({daysDeferred}d ago)
                  </span>
                )}
              </span>
            </div>
          )}
          {item.vendorName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vendor</span>
              <span>{item.vendorName}</span>
            </div>
          )}
          {item.categoryName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="flex items-center gap-1.5">
                {item.categoryColor && (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.categoryColor }} />
                )}
                {item.categoryName}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium tabular-nums">{formatCurrency(item.amountCents)}</span>
          </div>
          {paidSoFar > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paid so far</span>
              <span className="font-medium tabular-nums text-success">{formatCurrency(paidSoFar)}</span>
            </div>
          )}
          {remaining > 0 && !isCarried && (
            <div className="flex items-center justify-between border-t pt-1 mt-0.5">
              <span className="font-semibold">Balance remaining</span>
              <span className="font-bold tabular-nums text-danger">{formatCurrency(remaining)}</span>
            </div>
          )}
          {item.notes && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground flex-shrink-0">Notes</span>
              <span className="text-right text-xs text-muted-foreground">{item.notes}</span>
            </div>
          )}
        </div>

        {/* Payments list */}
        {paymentsLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading payments…
          </div>
        ) : payments.length > 0 ? (
          <div className="rounded-md border divide-y text-sm">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/10">
                <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="w-24 flex-shrink-0 tabular-nums text-muted-foreground">{p.paidDate}</span>
                <span className="flex-1 font-medium tabular-nums text-success">{formatCurrency(p.amountCents)}</span>
                {p.notes && (
                  <span className="truncate text-xs text-muted-foreground max-w-[100px]">{p.notes}</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isBusy}
                  onClick={() => handleDeletePayment(p.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {/* Add payment form */}
        {canPay && remaining > 0 && (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Record Payment
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="modal-pay-amount" className="text-xs">Amount</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="modal-pay-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="pl-6 h-9 text-sm"
                    placeholder={String(remaining / 100)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onFocus={() => { if (!amount) setAmount(defaultPayAmount); }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-pay-date" className="text-xs">Date</Label>
                <Input
                  id="modal-pay-date"
                  type="date"
                  className="h-9 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="modal-pay-notes" className="text-xs">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="modal-pay-notes"
                className="h-9 text-sm"
                placeholder="e.g. check #1234"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              size="sm"
              disabled={isBusy}
              onClick={handleAddPayment}
            >
              {addPayment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Record Payment
            </Button>
          </div>
        )}

        {/* Carry forward panel */}
        {carryMode && (
          <div className="rounded-md border border-dashed border-warning/30 bg-warning/5 px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-warning">
              Carry {formatCurrency(remaining)} forward to:
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
                className="h-8 text-xs border-warning/30 text-warning hover:bg-warning/10 flex-shrink-0"
                disabled={isBusy}
                onClick={handleCarryForward}
              >
                {carryForward.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                )}
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setCarryMode(false)}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canCarry && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-warning/20 text-warning hover:bg-warning/10"
              disabled={isBusy}
              onClick={() => setCarryMode(true)}
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Carry Forward
            </Button>
          )}
          {canUndoCarry && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-warning/20 text-warning hover:bg-warning/10"
              disabled={isBusy}
              onClick={handleReverseCarry}
            >
              {reverseCarry.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              )}
              Undo Carry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-xs"
            onClick={handleClose}
            disabled={isBusy}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
