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
  Calendar,
  DollarSign,
  AlertCircle,
  Tag,
  Store,
  Clock,
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
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
import { CarryForwardModal } from "./carry-forward-modal";
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

const STATUS_STYLES: Record<string, { border: string; bg: string; text: string; indicator: string }> = {
  paid: {
    border: "border-success/20",
    bg: "bg-success/5",
    text: "text-success",
    indicator: "bg-success",
  },
  received: {
    border: "border-success/20",
    bg: "bg-success/5",
    text: "text-success",
    indicator: "bg-success",
  },
  partial: {
    border: "border-primary/20",
    bg: "bg-primary/5",
    text: "text-primary",
    indicator: "bg-primary",
  },
  pending: {
    border: "border-warning/20",
    bg: "bg-warning/5",
    text: "text-warning",
    indicator: "bg-warning",
  },
  overdue: {
    border: "border-destructive/20",
    bg: "bg-destructive/5",
    text: "text-destructive",
    indicator: "bg-destructive",
  },
  skipped: {
    border: "border-muted/30",
    bg: "bg-muted/10",
    text: "text-muted-foreground",
    indicator: "bg-muted-foreground/45",
  },
  carried: {
    border: "border-orange/20",
    bg: "bg-orange/5",
    text: "text-orange",
    indicator: "bg-orange/60",
  },
};

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "One-time",
};

interface Props {
  occurrence: AnyOcc;
  type: "bill" | "income" | "credit";
  billName: string;
  interval: string;
  payments?: BillPayment[];
  receipts?: CreditReceipt[];
  categoryName?: string | null;
  categoryColor?: string | null;
  vendorName?: string | null;
  originalDueDate?: string | null;
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
    <div className="flex items-center gap-3 px-4 py-2 text-xs border-b border-border/40 last:border-0 hover:bg-muted/15 transition-colors">
      <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="w-20 flex-shrink-0 tabular-nums text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {payment.paidDate}
      </span>
      <span className="w-24 flex-shrink-0 tabular-nums font-bold text-success">
        {formatCurrency(payment.amountCents)}
      </span>
      <span className="rounded-md border border-success/20 bg-success/5 px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-success flex-shrink-0">
        Paid
      </span>
      {payment.notes && (
        <span className="truncate text-muted-foreground max-w-xs">{payment.notes}</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md cursor-pointer"
        disabled={deletePayment.isPending}
        onClick={() =>
          deletePayment.mutate({ id: payment.id, occurrenceId })
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
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
    <div className="flex items-center gap-3 px-4 py-2 text-xs border-b border-border/40 last:border-0 hover:bg-muted/15 transition-colors">
      <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="w-20 flex-shrink-0 tabular-nums text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {receipt.receivedDate}
      </span>
      <span className="w-24 flex-shrink-0 tabular-nums font-bold text-accent">
        {formatCurrency(receipt.amountCents)}
      </span>
      <span className="rounded-md border border-accent/20 bg-accent/5 px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-accent flex-shrink-0">
        Received
      </span>
      {receipt.notes && (
        <span className="truncate text-muted-foreground max-w-xs">{receipt.notes}</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md cursor-pointer"
        disabled={deleteReceipt.isPending}
        onClick={() =>
          deleteReceipt.mutate({ id: receipt.id, occurrenceId })
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function TrackerOccurrenceRow({
  occurrence,
  type,
  billName,
  interval,
  payments = [],
  receipts = [],
  categoryName,
  categoryColor,
  vendorName,
  originalDueDate,
}: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "income-pay">("view");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [carryForwardModalOpen, setCarryForwardModalOpen] = useState(false);
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
  const currentStyles = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

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
      ? `Received ${ (occurrence as IncomeOccurrence).receivedDate ?? "" }${
          (occurrence as IncomeOccurrence).receivedAmountCents
            ? ` · ${ formatCurrency((occurrence as IncomeOccurrence).receivedAmountCents!) }`
            : ""
        }`
      : null;

  const carryAmount = isCredit_ ? creditRemaining : remaining;

  return (
    <div
      className={cn(
        "relative pl-6 pb-6 last:pb-0 transition-opacity duration-250 group/timeline-item",
        isBusy && "opacity-60"
      )}
    >
      {/* Vertical timeline connector */}
      <div className="absolute left-[7px] top-2 bottom-0 w-[2px] bg-border/55 group-last/timeline-item:hidden" />

      {/* Timeline bullet */}
      <div
        className={cn(
          "absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center transition-all",
          currentStyles.indicator
        )}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-background" />
      </div>

      {/* Payment Modals */}
      {type === "bill" && isBill(occurrence) && (
        <PaymentModal
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          occurrence={occurrence}
          billName={billName}
          interval={interval}
        />
      )}

      {type === "credit" && isCredit(occurrence) && (
        <CreditReceiptModal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          occurrence={occurrence}
          creditName={billName}
          interval={interval}
        />
      )}

      {/* Carry Forward Modal */}
      {(type === "bill" || type === "credit") && (isBill(occurrence) || isCredit(occurrence)) && (
        <CarryForwardModal
          open={carryForwardModalOpen}
          onClose={() => setCarryForwardModalOpen(false)}
          occurrence={occurrence}
          name={billName}
          interval={interval}
          type={type}
          remaining={type === "bill" ? remaining : creditRemaining}
        />
      )}

      {/* Occurrence Card */}
      <div
        className={cn(
          "rounded-2xl border bg-card p-4 transition-all shadow-xs duration-200 hover:shadow-md hover:border-primary/20",
          status === "skipped" && "bg-muted/10 opacity-75 border-muted/30",
          status === "paid" && "border-success/15 bg-success/5",
          status === "received" && "border-success/15 bg-success/5",
          status === "overdue" && "border-destructive/15 bg-destructive/5"
        )}
      >
        {/* Card Header */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-foreground tracking-tight">{billName}</span>
              {categoryColor && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: categoryColor }}
                  title={categoryName ?? undefined}
                />
              )}
              {categoryName && (
                <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />
                  {categoryName}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {vendorName && (
                <span className="flex items-center gap-1">
                  <Store className="h-3 w-3 shrink-0" />
                  {vendorName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {INTERVAL_LABELS[interval] ?? interval}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase",
                currentStyles.border,
                currentStyles.bg,
                currentStyles.text
              )}
            >
              {status}
            </span>
            {(isBill(occurrence) || isCredit(occurrence)) && occurrence.carriedFromId && (
              <span className="rounded-md border border-orange/20 bg-orange/5 px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-orange">
                Carried From
              </span>
            )}
            {originalDueDate && originalDueDate !== dateStr && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3 flex-shrink-0" />
                Originally {originalDueDate}
                <span className="text-warning ml-0.5">
                  ({differenceInDays(parseISO(dateStr), parseISO(originalDueDate))}d)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Amount, Date & Input Modes */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-border/40 my-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Expected/Due Date */}
            {mode === "edit" ? (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-8 w-36 text-xs border-input bg-card text-foreground"
                />
              </div>
            ) : mode === "income-pay" ? (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Received Date</label>
                <Input
                  type="date"
                  value={incomePayDate}
                  onChange={(e) => setIncomePayDate(e.target.value)}
                  className="h-8 w-36 text-xs border-input bg-card text-foreground"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <Calendar className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                <span className="font-semibold">{dateStr}</span>
              </div>
            )}

            {/* Target Amount */}
            {mode === "edit" ? (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Amount</label>
                <div className="relative w-28">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="h-8 pl-6 text-xs w-28 border-input bg-card text-foreground"
                  />
                </div>
              </div>
            ) : mode === "income-pay" ? (
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Received Amount</label>
                <div className="relative w-28">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={incomePayAmount}
                    onChange={(e) => setIncomePayAmount(e.target.value)}
                    className="h-8 pl-6 text-xs w-28 border-input bg-card text-foreground"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-lg font-black tabular-nums tracking-tight leading-none",
                    isIncome ? "text-success" : isCredit_ ? "text-accent" : "text-destructive"
                  )}
                >
                  {(!isIncome && !isCredit_) ? `-${ formatCurrency(occurrence.amountCents) }` : formatCurrency(occurrence.amountCents)}
                </span>
                {paidSoFar > 0 && status !== "paid" && (
                  <span className="text-[10px] font-bold text-accent/80 mt-0.5">
                    {formatCurrency(remaining)} remaining
                  </span>
                )}
                {receivedSoFar > 0 && status !== "received" && (
                  <span className="text-[10px] font-bold text-accent/80 mt-0.5">
                    {formatCurrency(creditRemaining)} remaining
                  </span>
                )}
                {incomeReceiveInfo && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {incomeReceiveInfo}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Edit/Income Pay mode save/cancel actions */}
          {(mode === "edit" || mode === "income-pay") && (
            <div className="flex items-center gap-1.5 self-end">
              <Button
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs font-bold text-primary-foreground cursor-pointer rounded-lg",
                  mode === "edit" ? "bg-primary hover:bg-primary/90" : "bg-success hover:bg-success/90"
                )}
                onClick={mode === "edit" ? handleSaveEdit : handleIncomeReceive}
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 cursor-pointer rounded-lg"
                onClick={() => setMode("view")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>


        {/* Action Panel in view mode */}
        {mode === "view" && (
          <div className="flex flex-wrap items-center gap-1.5 justify-end mt-2">
            {/* Primary confirmation: Pay / Receive / Receive Credit */}
            {status !== "skipped" && status !== "carried" && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 px-3 text-xs font-bold transition-all rounded-lg cursor-pointer",
                  isIncome
                    ? "border-success/20 text-success bg-success/5 hover:bg-success/15 hover:border-success/30"
                    : "border-accent/20 text-accent bg-accent/5 hover:bg-accent/15 hover:border-accent/30"
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
                disabled={isBusy}
              >
                <Check className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span>
                  {isIncome
                    ? status === "received"
                      ? "Add Received"
                      : "Receive"
                    : isCredit_
                      ? status === "received"
                        ? "Add Receipt"
                        : "Receive Credits"
                      : status === "paid"
                        ? "Add Payment"
                        : "Pay"}
                </span>
              </Button>
            )}

            {/* Carry Forward */}
            {((type === "bill" && status !== "paid" && status !== "skipped" && status !== "carried" && remaining > 0) ||
              (type === "credit" && status !== "received" && status !== "skipped" && status !== "carried" && creditRemaining > 0)) && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-bold border-warning/20 text-warning bg-warning/5 hover:bg-warning/15 hover:border-warning/35 transition-all rounded-lg cursor-pointer"
                onClick={() => setCarryForwardModalOpen(true)}
                disabled={isBusy}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span>Carry Forward</span>
              </Button>
            )}

            {/* Skip / Undo Carry */}
            {((isIncome && status !== "received" && status !== "skipped") ||
              (isBill(occurrence) && occurrence.carriedFromId && !(occurrence.paidAmountCents && occurrence.paidAmountCents > 0)) ||
              (isCredit(occurrence) && occurrence.carriedFromId && !(occurrence.receivedAmountCents && occurrence.receivedAmountCents > 0))) && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 px-3 text-xs font-bold transition-all rounded-lg cursor-pointer",
                  isIncome
                    ? "border-border text-muted-foreground bg-muted/5 hover:bg-muted/15"
                    : "border-warning/20 text-warning bg-warning/5 hover:bg-warning/15"
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
                disabled={isBusy}
              >
                {isIncome ? (
                  <Minus className="h-3.5 w-3.5 mr-1 shrink-0" />
                ) : (
                  <ArrowLeft className="h-3.5 w-3.5 mr-1 shrink-0" />
                )}
                <span>{isIncome ? "Skip Check" : "Undo Carry"}</span>
              </Button>
            )}

            {/* Edit */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-lg cursor-pointer ml-auto"
              onClick={() => setMode("edit")}
              disabled={isBusy}
            >
              <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span>Edit</span>
            </Button>
          </div>
        )}

        {/* Payments Section */}
        {payments.length > 0 && (
          <div className="mt-4 border-t border-border/40 pt-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-2">
              Payments Ledger
            </div>
            <div className="divide-y divide-border/20 rounded-xl border border-border bg-muted/10 overflow-hidden">
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} occurrenceId={occurrence.id} />
              ))}
            </div>
          </div>
        )}

        {/* Receipts Section */}
        {receipts.length > 0 && (
          <div className="mt-4 border-t border-border/40 pt-3 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 pl-2">
              Receipts Ledger
            </div>
            <div className="divide-y divide-border/20 rounded-xl border border-border bg-muted/10 overflow-hidden">
              {receipts.map((r) => (
                <ReceiptRow key={r.id} receipt={r} occurrenceId={occurrence.id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
