"use client";

import { useState } from "react";
import {
  Check,
  CornerDownRight,
  Pencil,
  Trash2,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Minus,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr, nextOccurrenceDate } from "~/lib/dates";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  useCarryForwardOccurrence,
  useReverseCarryForward,
  useDeleteBillPayment,
  useMarkIncomeReceived,
  useMarkIncomeSkipped,
  useUpdateBillOccurrence,
  useUpdateIncomeOccurrence,
  useCarryForwardCreditOccurrence,
  useReverseCreditCarryForward,
  useDeleteCreditReceipt,
  useUpdateCreditOccurrence,
} from "~/hooks/use-occurrences";
import { PaymentModal } from "./payment-modal";
import { CreditReceiptModal } from "./credit-receipt-modal";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";
import type { CreditReceipt } from "~/db/schema/credit-receipts";

type AnyOcc = BillOccurrence | IncomeOccurrence | CreditOccurrence;

function isBill(occ: AnyOcc): occ is BillOccurrence {
  return "billId" in occ;
}

function isCredit(occ: AnyOcc): occ is CreditOccurrence {
  return "creditId" in occ;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "border-green-200 bg-green-100 text-green-800",
  received: "border-teal-200 bg-teal-100 text-teal-800",
  partial: "border-blue-200 bg-blue-50 text-blue-800",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-red-200 bg-red-100 text-red-800",
  skipped: "border-gray-200 bg-gray-100 text-gray-500",
  carried: "border-purple-200 bg-purple-50 text-purple-700",
};

interface Props {
  occurrence: AnyOcc;
  type: "bill" | "income" | "credit";
  billName: string;
  interval: string;
  payments?: BillPayment[];
  receipts?: CreditReceipt[];
}

function PaymentRow({
  payment,
  occurrenceId,
}: {
  payment: BillPayment;
  occurrenceId: string;
}) {
  const deletePayment = useDeleteBillPayment();
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pl-10 sm:pl-14 py-1 text-xs border-b border-dashed border-muted last:border-0 hover:bg-muted/10">
      <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      <span className="w-20 flex-shrink-0 tabular-nums text-muted-foreground">
        {payment.paidDate}
      </span>
      <span className="w-24 flex-shrink-0 tabular-nums font-medium text-green-700">
        {formatCurrency(payment.amountCents)}
      </span>
      <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[11px] text-green-700 flex-shrink-0">
        paid
      </span>
      {payment.notes && (
        <span className="truncate text-muted-foreground">{payment.notes}</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="sm:ml-auto h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
        disabled={deletePayment.isPending}
        onClick={() =>
          deletePayment.mutate({ id: payment.id, occurrenceId })
        }
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function ReceiptRow({
  receipt,
  occurrenceId,
}: {
  receipt: CreditReceipt;
  occurrenceId: string;
}) {
  const deleteReceipt = useDeleteCreditReceipt();
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pl-10 sm:pl-14 py-1 text-xs border-b border-dashed border-muted last:border-0 hover:bg-muted/10">
      <CornerDownRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      <span className="w-20 flex-shrink-0 tabular-nums text-muted-foreground">
        {receipt.receivedDate}
      </span>
      <span className="w-24 flex-shrink-0 tabular-nums font-medium text-teal-700">
        {formatCurrency(receipt.amountCents)}
      </span>
      <span className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[11px] text-teal-700 flex-shrink-0">
        received
      </span>
      {receipt.notes && (
        <span className="truncate text-muted-foreground">{receipt.notes}</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="sm:ml-auto h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
        disabled={deleteReceipt.isPending}
        onClick={() =>
          deleteReceipt.mutate({ id: receipt.id, occurrenceId })
        }
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function TrackerOccurrenceRow({ occurrence, type, billName, interval, payments = [], receipts = [] }: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "income-pay" | "carry">("view");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const today = toDateStr(new Date());

  const isIncome = type === "income";
  const isCredit_ = type === "credit";

  const dateStr = isBill(occurrence)
    ? occurrence.dueDate
    : isCredit(occurrence)
      ? occurrence.dueDate
      : (occurrence as IncomeOccurrence).expectedDate;

  const [editAmount, setEditAmount] = useState(
    String(occurrence.amountCents / 100)
  );
  const [editDate, setEditDate] = useState(dateStr);

  const status = occurrence.status;

  const paidSoFar = isBill(occurrence) ? (occurrence.paidAmountCents ?? 0) : 0;
  const remaining = isBill(occurrence)
    ? occurrence.amountCents - paidSoFar
    : 0;

  const receivedSoFar = isCredit(occurrence) ? (occurrence.receivedAmountCents ?? 0) : 0;
  const creditRemaining = isCredit(occurrence)
    ? occurrence.amountCents - receivedSoFar
    : 0;

  const [incomePayAmount, setIncomePayAmount] = useState(
    String(occurrence.amountCents / 100)
  );
  const [incomePayDate, setIncomePayDate] = useState(today);
  const [carryDate, setCarryDate] = useState(() =>
    (isBill(occurrence) || isCredit(occurrence))
      ? nextOccurrenceDate(occurrence.dueDate, interval)
      : today
  );

  const carryForward = useCarryForwardOccurrence();
  const reverseCarry = useReverseCarryForward();
  const carryForwardCredit = useCarryForwardCreditOccurrence();
  const reverseCarryCredit = useReverseCreditCarryForward();
  const markReceived = useMarkIncomeReceived();
  const skipIncome = useMarkIncomeSkipped();
  const updateBill = useUpdateBillOccurrence();
  const updateIncome = useUpdateIncomeOccurrence();
  const updateCredit = useUpdateCreditOccurrence();

  const isBusy =
    carryForward.isPending ||
    reverseCarry.isPending ||
    carryForwardCredit.isPending ||
    reverseCarryCredit.isPending ||
    markReceived.isPending ||
    skipIncome.isPending ||
    updateBill.isPending ||
    updateIncome.isPending ||
    updateCredit.isPending;

  async function handleIncomeReceive() {
    const cents =
      Math.round(parseFloat(incomePayAmount) * 100) || occurrence.amountCents;
    await markReceived.mutateAsync({
      id: occurrence.id,
      receivedDate: incomePayDate,
      receivedAmountCents: cents,
    });
    setMode("view");
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
    } else if (type === "credit") {
      await updateCredit.mutateAsync({
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

  const incomeReceiveInfo =
    status === "received" && !isBill(occurrence)
      ? `Received ${(occurrence as IncomeOccurrence).receivedDate ?? ""}${
          (occurrence as IncomeOccurrence).receivedAmountCents
            ? ` · ${formatCurrency((occurrence as IncomeOccurrence).receivedAmountCents!)}`
            : ""
        }`
      : null;

  const carryAmount = isCredit_ ? creditRemaining : remaining;

  return (
    <div
      className={cn(
        "border-b border-dashed border-muted last:border-0",
        isBusy && "opacity-60"
      )}
    >
      {/* Bill payment modal */}
      {type === "bill" && isBill(occurrence) && (
        <PaymentModal
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          occurrence={occurrence}
          billName={billName}
          interval={interval}
        />
      )}

      {/* Credit receipt modal */}
      {type === "credit" && isCredit(occurrence) && (
        <CreditReceiptModal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          occurrence={occurrence}
          creditName={billName}
          interval={interval}
        />
      )}

      {/* Carry-forward mode — full-width row replacement */}
      {mode === "carry" && (
        <div className="flex flex-wrap items-center gap-2 px-4 pl-8 sm:pl-10 py-2 bg-amber-50 border-b border-dashed border-amber-200">
          <span className="text-xs text-amber-700 flex-shrink-0 font-medium">
            Carry {formatCurrency(carryAmount)} to:
          </span>
          <Input
            type="date"
            value={carryDate}
            onChange={(e) => setCarryDate(e.target.value)}
            className="h-7 w-36 text-xs flex-shrink-0"
          />
          <div className="sm:ml-auto flex items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isCredit_ ? carryForwardCredit.isPending : carryForward.isPending}
              onClick={async () => {
                try {
                  if (isCredit_) {
                    await carryForwardCredit.mutateAsync({ id: occurrence.id, targetDate: carryDate });
                  } else {
                    await carryForward.mutateAsync({ id: occurrence.id, targetDate: carryDate });
                  }
                  setMode("view");
                } catch (e) {
                  // error surfaces via mutation error state; stay in carry mode
                }
              }}
            >
              {(isCredit_ ? carryForwardCredit.isPending : carryForward.isPending) ? (
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
              className="h-7 w-7 p-0"
              onClick={() => setMode("view")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Occurrence row */}
      {mode !== "carry" && (
      <div className="flex flex-wrap items-center gap-2 px-4 pl-8 sm:pl-10 py-1.5 text-sm hover:bg-muted/10 transition-colors">
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

        {/* Amount / input */}
        {mode === "edit" || mode === "income-pay" ? (
          <div className="relative w-28 flex-shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={mode === "edit" ? editAmount : incomePayAmount}
              onChange={(e) =>
                mode === "edit"
                  ? setEditAmount(e.target.value)
                  : setIncomePayAmount(e.target.value)
              }
              className="h-7 pl-5 text-xs w-28"
            />
          </div>
        ) : (
          <span
            className={cn(
              "w-24 tabular-nums font-medium flex-shrink-0 text-xs",
              isIncome ? "text-green-700" : isCredit_ ? "text-teal-700" : "text-red-600"
            )}
          >
            {(!isIncome && !isCredit_) ? `-${formatCurrency(occurrence.amountCents)}` : formatCurrency(occurrence.amountCents)}
          </span>
        )}

        {/* Income-pay date picker */}
        {mode === "income-pay" && (
          <Input
            type="date"
            value={incomePayDate}
            onChange={(e) => setIncomePayDate(e.target.value)}
            className="h-7 w-36 text-xs flex-shrink-0"
          />
        )}

        {/* Remaining balance (partial/overdue with some payments) */}
        {mode === "view" && isBill(occurrence) && paidSoFar > 0 && status !== "paid" && (
          <span className="text-xs tabular-nums text-blue-600 flex-shrink-0">
            {formatCurrency(remaining)} left
          </span>
        )}

        {mode === "view" && isCredit(occurrence) && receivedSoFar > 0 && status !== "received" && (
          <span className="text-xs tabular-nums text-teal-600 flex-shrink-0">
            {formatCurrency(creditRemaining)} left
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

        {mode === "view" && incomeReceiveInfo && (
          <span className="text-xs text-muted-foreground truncate">
            {incomeReceiveInfo}
          </span>
        )}

        {mode === "view" && (isBill(occurrence) || isCredit(occurrence)) && occurrence.carriedFromId && (
          <span className="inline-flex rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 flex-shrink-0">
            Deferred
          </span>
        )}

        {/* Actions */}
        <div className="w-full sm:w-auto sm:ml-auto">
          {mode === "edit" && (
            <div className="flex items-center gap-1 justify-end">
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
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
                className="h-7 w-7 p-0"
                onClick={() => setMode("view")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {mode === "income-pay" && (
            <div className="flex items-center gap-1 justify-end">
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleIncomeReceive}
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
                className="h-7 w-7 p-0"
                onClick={() => setMode("view")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {mode === "view" && (
            <div className="grid grid-cols-4 gap-1">
              {/* Pay / Receive / Receive Credit button */}
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 px-2 text-[11px] sm:text-xs",
                  status !== "skipped" && status !== "carried"
                    ? isIncome
                      ? "border-green-200 text-green-700 hover:bg-green-50"
                      : isCredit_
                        ? "border-teal-200 text-teal-700 hover:bg-teal-50"
                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                    : "invisible"
                )}
                onClick={() => {
                  if (isIncome) {
                    setIncomePayAmount(String(occurrence.amountCents / 100));
                    setIncomePayDate(today);
                    setMode("income-pay");
                  } else if (isCredit_) {
                    setReceiptModalOpen(true);
                  } else {
                    setPayModalOpen(true);
                  }
                }}
                disabled={isBusy || status === "skipped" || status === "carried"}
              >
                <Check className="h-3 w-3 mr-1" />
                <span className="sm:hidden">
                  {isCredit_ ? "Recv" : "Pay"}
                </span>
                <span className="hidden sm:inline">
                  {isIncome
                    ? status === "received"
                      ? "Add"
                      : "Receive"
                    : isCredit_
                      ? status === "received"
                        ? "Add Receipt"
                        : status === "partial"
                          ? `Receive ${formatCurrency(creditRemaining)}`
                          : "Receive"
                      : status === "paid"
                        ? "Add Payment"
                        : status === "partial"
                          ? `Pay ${formatCurrency(remaining)}`
                          : "Pay"}
                </span>
              </Button>

              {/* Carry Forward button */}
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 px-2 text-[11px] sm:text-xs border-amber-200 text-amber-700 hover:bg-amber-50",
                  !(
                    (type === "bill" &&
                      status !== "paid" &&
                      status !== "skipped" &&
                      status !== "carried" &&
                      remaining > 0) ||
                    (type === "credit" &&
                      status !== "received" &&
                      status !== "skipped" &&
                      status !== "carried" &&
                      creditRemaining > 0)
                  ) && "invisible"
                )}
                onClick={() => setMode("carry")}
                disabled={
                  isBusy ||
                  !(
                    (type === "bill" &&
                      status !== "paid" &&
                      status !== "skipped" &&
                      status !== "carried" &&
                      remaining > 0) ||
                    (type === "credit" &&
                      status !== "received" &&
                      status !== "skipped" &&
                      status !== "carried" &&
                      creditRemaining > 0)
                  )
                }
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                <span className="sm:hidden">Carry</span>
                <span className="hidden sm:inline">Carry Fwd</span>
              </Button>

              {/* Undo Carry / Skip Income button */}
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 px-2 text-[11px] sm:text-xs",
                  isIncome
                    ? "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    : "border-orange-200 text-orange-700 hover:bg-orange-50",
                  !(
                    (isIncome &&
                      status !== "received" &&
                      status !== "skipped") ||
                    (isBill(occurrence) &&
                      occurrence.carriedFromId &&
                      !(occurrence.paidAmountCents && occurrence.paidAmountCents > 0)) ||
                    (isCredit(occurrence) &&
                      occurrence.carriedFromId &&
                      !(occurrence.receivedAmountCents && occurrence.receivedAmountCents > 0))
                  ) && "invisible"
                )}
                onClick={() => {
                  if (isIncome) {
                    void skipIncome.mutateAsync(occurrence.id);
                  } else if (isCredit_) {
                    reverseCarryCredit.mutate(occurrence.id);
                  } else {
                    reverseCarry.mutate(occurrence.id);
                  }
                }}
                disabled={
                  isBusy ||
                  !(
                    (isIncome &&
                      status !== "received" &&
                      status !== "skipped") ||
                    (isBill(occurrence) &&
                      occurrence.carriedFromId &&
                      !(occurrence.paidAmountCents && occurrence.paidAmountCents > 0)) ||
                    (isCredit(occurrence) &&
                      occurrence.carriedFromId &&
                      !(occurrence.receivedAmountCents && occurrence.receivedAmountCents > 0))
                  )
                }
              >
                {isIncome ? (
                  <Minus className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowLeft className="h-3 w-3 mr-1" />
                )}
                <span className="sm:hidden">
                  {isIncome ? "Skip" : "Undo"}
                </span>
                <span className="hidden sm:inline">
                  {isIncome ? "Skip" : "Undo Carry"}
                </span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("edit")}
              >
                <Pencil className="h-3 w-3 mr-1" />
                <span>Edit</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Payments for this occurrence — always visible when they exist */}
      {payments.length > 0 && (
        <div className="bg-muted/5">
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} occurrenceId={occurrence.id} />
          ))}
        </div>
      )}

      {/* Receipts for this credit occurrence */}
      {receipts.length > 0 && (
        <div className="bg-muted/5">
          {receipts.map((r) => (
            <ReceiptRow key={r.id} receipt={r} occurrenceId={occurrence.id} />
          ))}
        </div>
      )}
    </div>
  );
}
