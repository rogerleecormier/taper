import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Receipt,
  Loader2,
  CornerDownRight,
  Trash2,
  Check,
  X,
  Pencil,
  Clock,
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr, nextOccurrenceDate } from "~/lib/dates";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { BillFormDialog } from "~/components/bills/bill-form-dialog";
import { PaymentModal } from "~/components/tracker/payment-modal";
import { useBillHistory } from "~/hooks/use-bills";
import {
  useDeleteBillPayment,
  useCarryForwardOccurrence,
  useReverseCarryForward,
  useReopenOccurrence,
  useUpdateBillOccurrence,
  useDeleteOccurrence,
} from "~/hooks/use-occurrences";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";

export const Route = createFileRoute("/_app/bills/$id")({
  component: BillDetailPage,
});

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "One-time",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "border-success/20 bg-success/10 text-success",
  partial: "border-warning/20 bg-warning/10 text-warning",
  pending: "border-border bg-muted/50 text-muted-foreground",
  overdue: "border-danger/20 bg-danger/10 text-danger",
  skipped: "border-border bg-muted/50 text-muted-foreground",
  carried: "border-accent/20 bg-accent/10 text-accent",
};

// ─── Payment row with delete ───────────────────────────────────────────────

function PaymentRow({
  payment,
  occurrenceId,
}: {
  payment: BillPayment;
  occurrenceId: string;
}) {
  const deletePayment = useDeleteBillPayment();
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/10">
      <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="w-24 flex-shrink-0 tabular-nums text-muted-foreground">
        {payment.paidDate}
      </span>
      <span className="w-28 flex-shrink-0 tabular-nums font-semibold text-success">
        {formatCurrency(payment.amountCents)}
      </span>
      {payment.notes && (
        <span className="flex-1 truncate text-xs text-muted-foreground">
          {payment.notes}
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-7 w-7 p-0 flex-shrink-0 text-muted-foreground hover:text-destructive"
        disabled={deletePayment.isPending}
        onClick={() => deletePayment.mutate({ id: payment.id, occurrenceId })}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Single occurrence card ─────────────────────────────────────────────────

function OccurrenceCard({
  occurrence,
  billName,
  interval,
}: {
  occurrence: BillOccurrence & { payments: BillPayment[]; originalDueDate?: string | null };
  billName: string;
  interval: string;
}) {
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [carryMode, setCarryMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editAmount, setEditAmount] = useState(
    String(occurrence.amountCents / 100)
  );
  const [editDate, setEditDate] = useState(occurrence.dueDate);
  const [carryDate, setCarryDate] = useState(() =>
    nextOccurrenceDate(occurrence.dueDate, interval)
  );

  const updateOccurrence = useUpdateBillOccurrence();
  const carryForward = useCarryForwardOccurrence();
  const reverseCarry = useReverseCarryForward();
  const reopen = useReopenOccurrence();
  const deleteOcc = useDeleteOccurrence();
  const [carryError, setCarryError] = useState<string | null>(null);

  const paidTotal = occurrence.payments.reduce(
    (s, p) => s + p.amountCents,
    0
  );
  const remaining = occurrence.amountCents - paidTotal;

  async function handleSaveEdit() {
    const cents = Math.round(parseFloat(editAmount) * 100);
    if (!cents || cents <= 0) return;
    await updateOccurrence.mutateAsync({
      id: occurrence.id,
      amountCents: cents,
      dueDate: editDate,
    });
    setEditMode(false);
  }

  async function handleCarryForward() {
    setCarryError(null);
    try {
      await carryForward.mutateAsync({
        id: occurrence.id,
        targetDate: carryDate,
      });
      setCarryMode(false);
    } catch (e) {
      setCarryError(
        e instanceof Error ? e.message : "Failed to carry forward balance."
      );
    }
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b">
        {editMode ? (
          <>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="h-8 w-36 text-sm"
            />
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="pl-6 h-8 text-sm w-32"
              />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleSaveEdit}
                disabled={updateOccurrence.isPending}
              >
                {updateOccurrence.isPending ? (
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
                onClick={() => setEditMode(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="font-medium tabular-nums text-sm">
              {occurrence.dueDate}
            </span>
            <span
              className={cn(
                "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize",
                STATUS_STYLES[occurrence.status] ?? STATUS_STYLES.pending
              )}
            >
              {occurrence.status}
            </span>
            {occurrence.carriedFromId && (
              <span className="inline-flex rounded border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                Deferred
              </span>
            )}
            {occurrence.originalDueDate && occurrence.originalDueDate !== occurrence.dueDate && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Originally: {occurrence.originalDueDate}
                {" "}
                <span className="text-warning">
                  ({differenceInDays(parseISO(occurrence.dueDate), parseISO(occurrence.originalDueDate))}d deferred)
                </span>
              </span>
            )}
            <span
              className={cn(
                "ml-auto font-semibold tabular-nums",
                occurrence.status === "skipped"
                  ? "text-muted-foreground"
                  : "text-danger"
              )}
            >
              {formatCurrency(occurrence.amountCents)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-danger/5 border-b border-danger/20">
          <span className="text-xs text-danger font-medium">
            Delete this instance{occurrence.payments.length > 0 ? " and its payments" : ""}?
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-2.5 text-xs"
              disabled={deleteOcc.isPending}
              onClick={() => deleteOcc.mutate(occurrence.id)}
            >
              {deleteOcc.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setConfirmDelete(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Payment list */}
      {occurrence.payments.length > 0 && (
        <div className="divide-y border-b">
          {occurrence.payments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              occurrenceId={occurrence.id}
            />
          ))}
        </div>
      )}

      {/* Balance summary */}
      {paidTotal > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/10 text-xs text-muted-foreground border-b">
          <span>
            Paid:{" "}
            <span className="font-semibold text-success">
              {formatCurrency(paidTotal)}
            </span>
          </span>
          {remaining > 0 && (
            <span>
              Remaining:{" "}
              <span className="font-semibold text-danger">
                {formatCurrency(remaining)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Skipped / carried notice */}
      {occurrence.status === "carried" && (
        <div className="px-4 py-2 text-xs text-accent bg-accent/5 border-b">
          Balance of {formatCurrency(remaining)} carried forward to a new instance
        </div>
      )}
      {occurrence.status === "skipped" && paidTotal === 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10 border-b">
          <span className="text-xs text-muted-foreground">
            Skipped with no payments — reopen to pay or carry forward
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs ml-3 flex-shrink-0"
            disabled={reopen.isPending}
            onClick={() => reopen.mutate(occurrence.id)}
          >
            {reopen.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Reopen
          </Button>
        </div>
      )}

      {/* Carry-forward inline form */}
      {carryMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/5 border-b border-dashed border-warning/25">
          <span className="text-xs text-warning font-medium flex-shrink-0">
            Carry {formatCurrency(remaining)} to:
          </span>
          <Input
            type="date"
            value={carryDate}
            onChange={(e) => setCarryDate(e.target.value)}
            className="h-8 w-40 text-xs"
          />
          <Button
            size="sm"
            className="h-7 px-2 text-xs bg-warning text-primary-foreground hover:bg-warning/90 flex-shrink-0"
            disabled={carryForward.isPending}
            onClick={handleCarryForward}
          >
            {carryForward.isPending ? (
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
            onClick={() => { setCarryMode(false); setCarryError(null); }}
          >
            <X className="h-3 w-3" />
          </Button>
          {carryError && (
            <span className="text-xs text-destructive">{carryError}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {occurrence.status !== "skipped" && occurrence.status !== "carried" && (
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs border-accent/20 text-accent hover:bg-accent/10"
            onClick={() => setPayModalOpen(true)}
          >
            <Check className="h-3 w-3 mr-1" />
            {occurrence.status === "paid"
              ? "Add Payment"
              : occurrence.status === "partial"
                ? `Pay ${formatCurrency(remaining)}`
                : "Pay"}
          </Button>
          {remaining > 0 && !carryMode && occurrence.status !== "paid" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setCarryMode(true)}
            >
              Carry Forward
            </Button>
          )}
          {occurrence.carriedFromId && paidTotal === 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs text-warning hover:text-warning/80"
              disabled={reverseCarry.isPending}
              onClick={() => reverseCarry.mutate(occurrence.id)}
            >
              Undo Carry
            </Button>
          )}
        </div>
      )}

      <PaymentModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        occurrence={occurrence}
        billName={billName}
        interval={interval}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

function BillDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useBillHistory(id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Expense not found.</p>
        <Link to="/bills" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Expenses
        </Link>
      </div>
    );
  }

  const { bill, occurrences } = data;

  // Exclude "carried" occurrences from totals — their balance is already represented
  // by the destination occurrence, so counting both would double the amount.
  const nonCarried = occurrences.filter((o) => o.status !== "carried");
  const totalBilled = nonCarried.reduce((s, o) => s + o.amountCents, 0);
  const totalPaid = occurrences.reduce(
    (s, o) => s + o.payments.reduce((ps, p) => ps + p.amountCents, 0),
    0
  );
  const outstanding = totalBilled - totalPaid;
  const activeOccurrences = nonCarried.filter(
    (o) => o.status !== "skipped" && o.status !== "paid"
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to="/bills"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Expenses
      </Link>

      {/* Bill header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-danger/10 border border-danger/20 p-2.5">
            <Receipt className="h-5 w-5 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">{bill.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(bill.amountCents)}
              </span>
              <span>{INTERVAL_LABELS[bill.interval] ?? bill.interval}</span>
              {bill.vendor && <span>{bill.vendor.name}</span>}
              {bill.category && (
                <span className="flex items-center gap-1">
                  {bill.category.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: bill.category.color }}
                    />
                  )}
                  {bill.category.name}
                </span>
              )}
              <Badge
                className={
                  bill.isActive
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-border bg-muted/50 text-muted-foreground"
                }
              >
                {bill.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditDialogOpen(true)}
          className="flex-shrink-0"
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit Series
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Instances", value: occurrences.length.toString() },
          { label: "Open", value: activeOccurrences.toString() },
          {
            label: "Total Paid",
            value: formatCurrency(totalPaid),
            valueClass: "text-success",
          },
          {
            label: "Outstanding",
            value: formatCurrency(outstanding),
            valueClass: outstanding > 0 ? "text-danger" : "text-muted-foreground",
          },
        ].map(({ label, value, valueClass }) => (
          <div
            key={label}
            className="rounded-lg border bg-card px-4 py-3 space-y-0.5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={cn("text-xl font-bold tabular-nums", valueClass)}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Occurrence history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Instance History
        </h2>

        {occurrences.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No instances generated yet.
            </p>
          </div>
        ) : (
          occurrences.map((occ) => (
            <OccurrenceCard
              key={occ.id}
              occurrence={occ}
              billName={bill.name}
              interval={bill.interval}
            />
          ))
        )}
      </div>

      {/* Edit series dialog */}
      <BillFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        billId={bill.id}
        defaultValues={{
          name: bill.name,
          vendorId: bill.vendorId,
          categoryId: bill.categoryId,
          amountCents: bill.amountCents,
          interval: bill.interval,
          startDate: bill.startDate,
          endDate: bill.endDate ?? null,
          dayOfMonth: bill.dayOfMonth ?? null,
          dayOfWeek: bill.dayOfWeek ?? null,
          autoPay: bill.autoPay,
          notes: bill.notes ?? "",
        }}
      />
    </div>
  );
}
