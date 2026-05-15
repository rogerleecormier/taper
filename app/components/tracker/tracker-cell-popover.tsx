"use client";

import { useState } from "react";
import { X, Check, SkipForward } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { useMarkOccurrencePaid, useMarkOccurrenceSkipped } from "~/hooks/use-occurrences";
import { cn } from "~/lib/utils";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";

interface TrackerCellPopoverProps {
  open: boolean;
  onClose: () => void;
  occurrence: BillOccurrence | null;
  dateStr: string;
  billId?: string;
  trigger: React.ReactNode;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  paid: "border-green-200 bg-green-100 text-green-800",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-red-200 bg-red-100 text-red-800",
  skipped: "border-gray-200 bg-gray-100 text-gray-500",
};

export function TrackerCellPopover({
  open,
  onClose,
  occurrence,
  trigger,
}: TrackerCellPopoverProps) {
  const today = toDateStr(new Date());
  const [paidDate, setPaidDate] = useState(today);
  const [actualAmount, setActualAmount] = useState(
    occurrence ? String(occurrence.amountCents / 100) : ""
  );

  const markPaid = useMarkOccurrencePaid();
  const markSkipped = useMarkOccurrenceSkipped();

  async function handleMarkPaid() {
    if (!occurrence) return;
    const cents = Math.round(parseFloat(actualAmount) * 100);
    await markPaid.mutateAsync({
      id: occurrence.id,
      paidDate,
      paidAmountCents: isNaN(cents) ? occurrence.amountCents : cents,
    });
    onClose();
  }

  async function handleMarkSkipped() {
    if (!occurrence) return;
    await markSkipped.mutateAsync(occurrence.id);
    onClose();
  }

  const isBusy = markPaid.isPending || markSkipped.isPending;

  return (
    <Popover open={open} onOpenChange={(v) => !v && onClose()}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80" side="bottom" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">Bill Details</p>
              {occurrence && (
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold capitalize",
                    STATUS_BADGE_CLASSES[occurrence.status] ??
                      STATUS_BADGE_CLASSES.pending
                  )}
                >
                  {occurrence.status}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!occurrence ? (
            <p className="text-sm text-muted-foreground">
              No bill scheduled for this period.
            </p>
          ) : (
            <>
              {/* Amount */}
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Amount due</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(occurrence.amountCents)}
                </p>
              </div>

              {/* Mark as Paid section */}
              {occurrence.status !== "paid" && occurrence.status !== "skipped" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mark as Paid
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="paid-date" className="text-xs">
                      Payment date
                    </Label>
                    <Input
                      id="paid-date"
                      type="date"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="actual-amount" className="text-xs">
                      Actual amount paid (optional)
                    </Label>
                    <Input
                      id="actual-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(occurrence.amountCents / 100)}
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleMarkPaid}
                    disabled={isBusy}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    {markPaid.isPending ? "Saving..." : "Mark as Paid"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleMarkSkipped}
                    disabled={isBusy}
                  >
                    <SkipForward className="mr-1.5 h-4 w-4" />
                    {markSkipped.isPending ? "Saving..." : "Mark as Skipped"}
                  </Button>
                </div>
              )}

              {/* Already paid / skipped */}
              {(occurrence.status === "paid" || occurrence.status === "skipped") && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {occurrence.status === "paid" && occurrence.paidDate && (
                    <p>
                      Paid on{" "}
                      <span className="font-medium text-foreground">
                        {occurrence.paidDate}
                      </span>
                      {occurrence.paidAmountCents && (
                        <>
                          {" "}for{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(occurrence.paidAmountCents)}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {occurrence.status === "skipped" && (
                    <p>This occurrence was skipped.</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Close */}
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
