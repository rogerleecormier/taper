"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  useAddBillPayment,
  useCarryForwardOccurrence,
  useDeleteBillPayment,
  useBillPayments,
  useMarkIncomeReceived,
  useMarkIncomeSkipped,
  useUpdateBillOccurrence,
  useUpdateIncomeOccurrence,
} from "~/hooks/use-occurrences";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";

type AnyOcc = BillOccurrence | IncomeOccurrence;

function isBill(occ: AnyOcc): occ is BillOccurrence {
  return "dueDate" in occ;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "border-green-200 bg-green-100 text-green-800",
  received: "border-green-200 bg-green-100 text-green-800",
  partial: "border-blue-200 bg-blue-50 text-blue-800",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-red-200 bg-red-100 text-red-800",
  skipped: "border-gray-200 bg-gray-100 text-gray-500",
};

interface Props {
  occurrence: AnyOcc;
  type: "bill" | "income";
}

function BillPaymentHistory({ occurrenceId }: { occurrenceId: string }) {
  const { data: payments = [], isLoading } = useBillPayments(occurrenceId);
  const deletePayment = useDeleteBillPayment();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-12 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading payments…
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <p className="px-12 py-1 text-xs italic text-muted-foreground">
        No payments recorded
      </p>
    );
  }

  return (
    <div className="divide-y divide-dashed">
      {payments.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 px-12 py-1 text-xs hover:bg-muted/10"
        >
          <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="tabular-nums font-medium text-green-700">
            {formatCurrency(p.amountCents)}
          </span>
          <span className="text-muted-foreground">on {p.paidDate}</span>
          {p.notes && (
            <span className="truncate text-muted-foreground">— {p.notes}</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
            disabled={deletePayment.isPending}
            onClick={() =>
              deletePayment.mutate({ id: p.id, occurrenceId: occurrenceId })
            }
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function TrackerOccurrenceRow({ occurrence, type }: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "pay">("view");
  const [showPayments, setShowPayments] = useState(false);
  const today = toDateStr(new Date());

  const dateStr = isBill(occurrence) ? occurrence.dueDate : occurrence.expectedDate;
  const [editAmount, setEditAmount] = useState(
    String(occurrence.amountCents / 100)
  );
  const [editDate, setEditDate] = useState(dateStr);

  const isIncome = type === "income";
  const status = occurrence.status;

  // For bill occurrences: remaining balance
  const paidSoFar = isBill(occurrence) ? (occurrence.paidAmountCents ?? 0) : 0;
  const remaining = isBill(occurrence)
    ? occurrence.amountCents - paidSoFar
    : 0;

  const [payAmount, setPayAmount] = useState(
    String(Math.max(remaining, occurrence.amountCents) / 100)
  );
  const [payDate, setPayDate] = useState(
    isBill(occurrence) ? (occurrence.paidDate ?? today) : today
  );

  const addPayment = useAddBillPayment();
  const carryForward = useCarryForwardOccurrence();
  const markReceived = useMarkIncomeReceived();
  const skipIncome = useMarkIncomeSkipped();
  const updateBill = useUpdateBillOccurrence();
  const updateIncome = useUpdateIncomeOccurrence();

  const isBusy =
    addPayment.isPending ||
    carryForward.isPending ||
    markReceived.isPending ||
    skipIncome.isPending ||
    updateBill.isPending ||
    updateIncome.isPending;

  const isCompleted =
    status === "paid" || status === "received" || status === "skipped";
  const hasPayments = isBill(occurrence) && paidSoFar > 0;
  const paymentCount = hasPayments ? null : null; // count shown via history

  async function handlePay() {
    const cents = Math.round(parseFloat(payAmount) * 100) || remaining || occurrence.amountCents;
    if (isIncome) {
      await markReceived.mutateAsync({
        id: occurrence.id,
        receivedDate: payDate,
        receivedAmountCents: cents,
      });
    } else {
      await addPayment.mutateAsync({
        occurrenceId: occurrence.id,
        amountCents: cents,
        paidDate: payDate,
      });
    }
    setMode("view");
    if (!isIncome && cents > 0) setShowPayments(true);
  }

  async function handleCarryForward() {
    await carryForward.mutateAsync(occurrence.id);
  }

  async function handleSkipIncome() {
    await skipIncome.mutateAsync(occurrence.id);
  }

  async function handleSaveEdit() {
    const cents = Math.round(parseFloat(editAmount) * 100);
    if (!cents || cents <= 0) return;
    if (type === "bill") {
      await updateBill.mutateAsync({
        id: occurrence.id,
        amountCents: cents,
        dueDate: editDate,
      });
    } else {
      await updateIncome.mutateAsync({
        id: occurrence.id,
        amountCents: cents,
        expectedDate: editDate,
      });
    }
    setMode("view");
  }

  // Reset pay amount when switching to pay mode
  function openPayMode() {
    const defaultAmount =
      isBill(occurrence) && remaining > 0 ? remaining : occurrence.amountCents;
    setPayAmount(String(defaultAmount / 100));
    setPayDate(today);
    setMode("pay");
  }

  const incomeReceiveInfo =
    status === "received" && !isBill(occurrence)
      ? `Received ${(occurrence as IncomeOccurrence).receivedDate ?? ""}${
          (occurrence as IncomeOccurrence).receivedAmountCents
            ? ` · ${formatCurrency((occurrence as IncomeOccurrence).receivedAmountCents!)}`
            : ""
        }`
      : null;

  return (
    <div
      className={cn(
        "border-b border-dashed border-muted last:border-0",
        isBusy && "opacity-60"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-4 pl-10 py-1.5 text-sm hover:bg-muted/10 transition-colors">
        {/* Date column */}
        {mode === "edit" ? (
          <Input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="h-7 w-36 text-xs flex-shrink-0"
          />
        ) : (
          <span className="w-20 flex-shrink-0 text-xs tabular-nums text-muted-foreground">
            {dateStr}
          </span>
        )}

        {/* Amount / input column */}
        {mode === "edit" || mode === "pay" ? (
          <div className="relative w-28 flex-shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={mode === "edit" ? editAmount : payAmount}
              onChange={(e) =>
                mode === "edit"
                  ? setEditAmount(e.target.value)
                  : setPayAmount(e.target.value)
              }
              className="h-7 pl-5 text-xs w-28"
            />
          </div>
        ) : (
          <span
            className={cn(
              "w-24 tabular-nums font-medium flex-shrink-0 text-xs",
              isIncome ? "text-green-700" : "text-red-600"
            )}
          >
            {formatCurrency(occurrence.amountCents)}
          </span>
        )}

        {/* Pay-mode date picker */}
        {mode === "pay" && (
          <Input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="h-7 w-36 text-xs flex-shrink-0"
          />
        )}

        {/* Balance remaining (partial/overdue with payments) */}
        {mode === "view" && isBill(occurrence) && paidSoFar > 0 && status !== "paid" && (
          <span className="text-xs tabular-nums text-blue-600 flex-shrink-0">
            {formatCurrency(remaining)} left
          </span>
        )}

        {/* Status badge */}
        {mode === "view" && (
          <span
            className={cn(
              "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize flex-shrink-0",
              STATUS_STYLES[status] ?? STATUS_STYLES.pending
            )}
          >
            {status}
          </span>
        )}

        {/* Income receive info */}
        {mode === "view" && incomeReceiveInfo && (
          <span className="text-xs text-muted-foreground truncate">
            {incomeReceiveInfo}
          </span>
        )}

        {/* Skipped label for bills */}
        {mode === "view" && type === "bill" && status === "skipped" && (
          <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 flex-shrink-0">
            Balance carried forward
          </span>
        )}

        {/* Payment history toggle (bills with any payments) */}
        {mode === "view" && hasPayments && (
          <button
            className="inline-flex items-center gap-0.5 rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => setShowPayments((v) => !v)}
          >
            Payments
            {showPayments ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          {mode === "edit" && (
            <>
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleSaveEdit}
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setMode("view")}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}

          {mode === "pay" && (
            <>
              <Button
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs",
                  isIncome ? "bg-green-600 hover:bg-green-700" : ""
                )}
                onClick={handlePay}
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Confirm
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setMode("view")}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}

          {mode === "view" && (
            <>
              {/* Pay / Receive — not shown for skipped */}
              {status !== "skipped" && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-6 px-2 text-xs",
                    isIncome
                      ? "border-green-200 text-green-700 hover:bg-green-50"
                      : "border-blue-200 text-blue-700 hover:bg-blue-50"
                  )}
                  onClick={openPayMode}
                  disabled={isBusy}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {status === "paid" || status === "received"
                    ? "Add Payment"
                    : isIncome
                      ? "Receive"
                      : status === "partial"
                        ? `Pay ${formatCurrency(remaining)}`
                        : "Pay"}
                </Button>
              )}

              {/* Carry Forward (bills only, not yet fully paid or skipped) */}
              {type === "bill" &&
                status !== "paid" &&
                status !== "skipped" &&
                remaining > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleCarryForward}
                    disabled={isBusy}
                  >
                    Carry Fwd
                  </Button>
                )}

              {/* Skip (income only) */}
              {isIncome && status !== "received" && status !== "skipped" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleSkipIncome}
                  disabled={isBusy}
                >
                  Skip
                </Button>
              )}

              {/* Edit */}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setMode("edit")}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Payment history (bills only) */}
      {showPayments && isBill(occurrence) && (
        <div className="bg-muted/5 pb-1">
          <BillPaymentHistory occurrenceId={occurrence.id} />
        </div>
      )}
    </div>
  );
}
