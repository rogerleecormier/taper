"use client";

import { useState, useEffect } from "react";
import { Loader2, Trash2, AlertCircle, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatCurrency } from "~/lib/currency";
import { useUpdateBillPayment, useDeleteBillPayment } from "~/hooks/use-occurrences";

export interface PaymentEditItem {
  paymentId: string;
  occurrenceId: string;
  amountCents: number;
  paidDate: string;
  notes: string | null;
  billName: string;
  occurrenceDueDate: string;
}

interface PaymentEditModalProps {
  item: PaymentEditItem | null;
  open: boolean;
  onClose: () => void;
}

export function PaymentEditModal({ item, open, onClose }: PaymentEditModalProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useUpdateBillPayment();
  const remove = useDeleteBillPayment();
  const isBusy = update.isPending || remove.isPending;

  useEffect(() => {
    if (item) {
      setAmount(String(item.amountCents / 100));
      setDate(item.paidDate);
      setNotes(item.notes ?? "");
      setConfirmDelete(false);
      setError(null);
    }
  }, [item]);

  function handleClose() {
    setConfirmDelete(false);
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!item) return;
    setError(null);
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    try {
      await update.mutateAsync({
        id: item.paymentId,
        amountCents: cents,
        paidDate: date,
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes.");
    }
  }

  async function handleDelete() {
    if (!item) return;
    setError(null);
    try {
      await remove.mutateAsync({ id: item.paymentId, occurrenceId: item.occurrenceId });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete payment.");
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Payment</DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{item.billName}</span>
          {" · "}due {item.occurrenceDueDate}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-pay-amount" className="text-xs">Amount</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="edit-pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-6 h-9 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isBusy}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pay-date" className="text-xs">Date paid</Label>
              <Input
                id="edit-pay-date"
                type="date"
                className="h-9 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-pay-notes" className="text-xs">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="edit-pay-notes"
              className="h-9 text-sm"
              placeholder="e.g. check #1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isBusy}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {confirmDelete ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-2">
            <p className="text-xs text-destructive font-medium">
              Delete this payment of {formatCurrency(item.amountCents)}? This will update the occurrence balance.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                disabled={isBusy}
                onClick={handleDelete}
              >
                {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Confirm delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setConfirmDelete(false)}
                disabled={isBusy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              disabled={isBusy}
              onClick={() => setConfirmDelete(true)}
              title="Delete payment"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleClose} disabled={isBusy}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs" disabled={isBusy} onClick={handleSave}>
                {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
