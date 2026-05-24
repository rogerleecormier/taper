import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO, subMonths, addMonths } from "date-fns";
import { CreditCard, ExternalLink } from "lucide-react";
import {
  useScheduledPaymentsForPage,
  usePaidPaymentsForPage,
} from "~/hooks/use-occurrences";
import { OccurrenceDetailModal, type OccurrenceModalItem } from "~/components/tracker/occurrence-detail-modal";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import type { OccurrenceStatus } from "~/db/schema/bill-occurrences";

export const Route = createFileRoute("/_app/payments/")({
  component: PaymentsPage,
});

const STATUS_STYLES: Record<OccurrenceStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "border-border bg-muted/50 text-muted-foreground" },
  overdue:  { label: "Overdue",  className: "border-danger/20 bg-danger/10 text-danger" },
  partial:  { label: "Partial",  className: "border-warning/20 bg-warning/10 text-warning" },
  paid:     { label: "Paid",     className: "border-success/20 bg-success/10 text-success" },
  skipped:  { label: "Skipped",  className: "border-border bg-muted/50 text-muted-foreground" },
  carried:  { label: "Carried",  className: "border-accent/20 bg-accent/10 text-accent" },
};

function StatusBadge({ status }: { status: OccurrenceStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", s.className)}>
      {s.label}
    </span>
  );
}

const RANGE_OPTIONS = [
  { months: 1,  label: "1 Mo" },
  { months: 3,  label: "3 Mo" },
  { months: 6,  label: "6 Mo" },
  { months: 12, label: "12 Mo" },
] as const;

function PaymentsPage() {
  const [showPaid, setShowPaid] = useState(false);
  const [rangeMonths, setRangeMonths] = useState<1 | 3 | 6 | 12>(3);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [modalItem, setModalItem] = useState<OccurrenceModalItem | null>(null);

  const today = toDateStr(new Date());
  const rangeEnd = toDateStr(addMonths(new Date(), rangeMonths));
  const rangeStart = toDateStr(subMonths(new Date(), rangeMonths));

  const { data: scheduled = [], isLoading: scheduledLoading, isError: scheduledError } =
    useScheduledPaymentsForPage({ endDate: rangeEnd });

  const { data: paidPayments = [], isLoading: paidLoading, isError: paidError } =
    usePaidPaymentsForPage({ startDate: rangeStart, endDate: today });

  const vendors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of scheduled) {
      if (r.vendorId && r.vendorName) seen.set(r.vendorId, r.vendorName);
    }
    for (const r of paidPayments) {
      if (r.vendorId && r.vendorName) seen.set(r.vendorId, r.vendorName);
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scheduled, paidPayments]);

  const filteredScheduled = useMemo(() => {
    if (vendorFilter === "all") return scheduled;
    if (vendorFilter === "__none__") return scheduled.filter((r) => !r.vendorId);
    return scheduled.filter((r) => r.vendorId === vendorFilter);
  }, [scheduled, vendorFilter]);

  const filteredPaid = useMemo(() => {
    if (vendorFilter === "all") return paidPayments;
    if (vendorFilter === "__none__") return paidPayments.filter((r) => !r.vendorId);
    return paidPayments.filter((r) => r.vendorId === vendorFilter);
  }, [paidPayments, vendorFilter]);

  const isLoading = scheduledLoading || (showPaid && paidLoading);
  const isError = scheduledError || (showPaid && paidError);

  function openScheduledModal(row: typeof scheduled[number]) {
    setModalItem({
      occurrenceId: row.occurrenceId,
      billId: row.billId,
      billName: row.billName,
      billInterval: row.billInterval,
      dueDate: row.dueDate,
      amountCents: row.amountCents,
      paidAmountCents: row.paidAmountCents,
      status: row.status,
      notes: row.notes,
      carriedFromId: row.carriedFromId,
      vendorName: row.vendorName,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
    });
  }

  function openPaidModal(row: typeof paidPayments[number]) {
    setModalItem({
      occurrenceId: row.occurrenceId,
      billId: row.billId,
      billName: row.billName,
      billInterval: row.billInterval,
      dueDate: row.occurrenceDueDate,
      amountCents: row.occurrenceAmountCents,
      paidAmountCents: row.occurrencePaidAmountCents,
      status: row.occurrenceStatus,
      notes: row.paymentNotes,
      carriedFromId: null,
      vendorName: row.vendorName,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scheduled and recorded payments across all expenses.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="vendor-filter" className="text-sm font-medium text-foreground/80 whitespace-nowrap">
            Vendor
          </label>
          <select
            id="vendor-filter"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value="__none__">No vendor</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPaid}
            onChange={(e) => setShowPaid(e.target.checked)}
            className="h-4 w-4 rounded border-input bg-card text-primary focus:ring-primary focus:ring-offset-background"
          />
          Show paid payments
        </label>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-1">Range:</span>
          <div className="inline-flex rounded-md border border-border bg-secondary/30 p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.months}
                onClick={() => setRangeMonths(opt.months)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
                  rangeMonths === opt.months
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-dashed border-danger/30 bg-danger/5 py-12 text-center">
          <p className="text-sm text-danger font-medium">Failed to load payments. Please refresh and try again.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-10">
          <ScheduledSection rows={filteredScheduled} onOpenModal={openScheduledModal} />
          {showPaid && (
            <PaidSection rows={filteredPaid} rangeMonths={rangeMonths} onOpenModal={openPaidModal} />
          )}
        </div>
      )}

      <OccurrenceDetailModal
        item={modalItem}
        open={!!modalItem}
        onClose={() => setModalItem(null)}
      />
    </div>
  );
}

// ─── Scheduled ───────────────────────────────────────────────────────────────

type ScheduledRow = {
  occurrenceId: string;
  billId: string;
  dueDate: string;
  amountCents: number;
  paidAmountCents: number | null;
  status: OccurrenceStatus;
  notes: string | null;
  carriedFromId: string | null;
  billName: string;
  billInterval: "daily" | "weekly" | "biweekly" | "monthly" | "standalone";
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

function ScheduledSection({ rows, onOpenModal }: { rows: ScheduledRow[]; onOpenModal: (r: ScheduledRow) => void }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Scheduled{" "}
        <span className="font-normal normal-case text-muted-foreground/60">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <EmptyState message="No pending or overdue payments." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/30">
              <tr>
                <Th>Expense</Th>
                <Th>Vendor</Th>
                <Th>Due Date</Th>
                <Th right>Amount Due</Th>
                <Th right>Paid So Far</Th>
                <Th>Status</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rows.map((row) => (
                <tr key={row.occurrenceId} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to="/bills/$id"
                        params={{ id: row.billId }}
                        className="font-medium text-sm text-accent hover:underline"
                      >
                        {row.billName}
                      </Link>
                      {row.carriedFromId && (
                        <span className="inline-flex items-center rounded border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          Deferred
                        </span>
                      )}
                    </div>
                    {row.notes && (
                      <div className="text-xs text-muted-foreground/75 truncate max-w-xs">{row.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.vendorName ?? <Dash />}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/90 whitespace-nowrap">
                    {format(parseISO(row.dueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground whitespace-nowrap">
                    {formatCurrency(row.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                    {row.paidAmountCents && row.paidAmountCents > 0 ? (
                      <span className="text-warning font-medium">{formatCurrency(row.paidAmountCents)}</span>
                    ) : (
                      <Dash />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenModal(row)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                      title="Open details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Paid ─────────────────────────────────────────────────────────────────────

type PaidRow = {
  paymentId: string;
  paymentAmountCents: number;
  paidDate: string;
  paymentNotes: string | null;
  occurrenceId: string;
  occurrenceDueDate: string;
  occurrenceAmountCents: number;
  occurrencePaidAmountCents: number | null;
  occurrenceStatus: OccurrenceStatus;
  billId: string;
  billName: string;
  billInterval: "daily" | "weekly" | "biweekly" | "monthly" | "standalone";
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

function PaidSection({ rows, rangeMonths, onOpenModal }: { rows: PaidRow[]; rangeMonths: number; onOpenModal: (r: PaidRow) => void }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Paid Payments — last {rangeMonths} {rangeMonths === 1 ? "month" : "months"}{" "}
        <span className="font-normal normal-case text-muted-foreground/60">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <EmptyState message={`No payments recorded in the last ${rangeMonths} ${rangeMonths === 1 ? "month" : "months"}.`} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/30">
              <tr>
                <Th>Expense</Th>
                <Th>Vendor</Th>
                <Th>Due Date</Th>
                <Th>Payment Date</Th>
                <Th right>Amount Paid</Th>
                <Th right>Occurrence Total</Th>
                <Th>Occurrence Status</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rows.map((row) => (
                <tr key={row.paymentId} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to="/bills/$id"
                      params={{ id: row.billId }}
                      className="inline-flex items-center gap-1 font-medium text-sm text-accent hover:underline"
                    >
                      {row.billName}
                    </Link>
                    {row.paymentNotes && (
                      <div className="text-xs text-muted-foreground/75 truncate max-w-xs">{row.paymentNotes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {row.vendorName ?? <Dash />}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/90 whitespace-nowrap">
                    {format(parseISO(row.occurrenceDueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                    {format(parseISO(row.paidDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-success whitespace-nowrap">
                    {formatCurrency(row.paymentAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground/90 whitespace-nowrap">
                    {formatCurrency(row.occurrenceAmountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.occurrenceStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onOpenModal(row)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                      title="Open details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
        right ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function Dash() {
  return <span className="text-muted-foreground/30">—</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-10 text-center">
      <CreditCard className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
