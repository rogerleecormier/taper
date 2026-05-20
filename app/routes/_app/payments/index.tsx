import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO, subMonths } from "date-fns";
import { CreditCard, ExternalLink } from "lucide-react";
import {
  useScheduledPaymentsForPage,
  usePaidPaymentsForPage,
} from "~/hooks/use-occurrences";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import type { OccurrenceStatus } from "~/db/schema/bill-occurrences";

export const Route = createFileRoute("/_app/payments/")({
  component: PaymentsPage,
});

const STATUS_STYLES: Record<OccurrenceStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-gray-100 text-gray-700" },
  overdue:  { label: "Overdue",  className: "bg-red-100 text-red-700" },
  partial:  { label: "Partial",  className: "bg-amber-100 text-amber-700" },
  paid:     { label: "Paid",     className: "bg-green-100 text-green-700" },
  skipped:  { label: "Skipped",  className: "bg-gray-100 text-gray-500" },
  carried:  { label: "Carried",  className: "bg-blue-100 text-blue-700" },
};

function StatusBadge({ status }: { status: OccurrenceStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", s.className)}>
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

  const today = toDateStr(new Date());
  const rangeStart = toDateStr(subMonths(new Date(), rangeMonths));

  const { data: scheduled = [], isLoading: scheduledLoading, isError: scheduledError } =
    useScheduledPaymentsForPage();

  const { data: paidPayments = [], isLoading: paidLoading, isError: paidError } =
    usePaidPaymentsForPage({ startDate: rangeStart, endDate: today });

  // Build vendor list from both data sources for the dropdown
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scheduled and recorded payments across all expenses.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Vendor filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="vendor-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Vendor
          </label>
          <select
            id="vendor-filter"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value="__none__">No vendor</option>
          </select>
        </div>

        {/* Show paid toggle */}
        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPaid}
            onChange={(e) => setShowPaid(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show paid payments
        </label>

        {/* Date range toggles — always visible */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500 mr-1">Range:</span>
          <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.months}
                onClick={() => setRangeMonths(opt.months)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium transition-colors",
                  rangeMonths === opt.months
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
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
            <div key={i} className="h-12 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-red-600">Failed to load payments. Please refresh and try again.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-10">
          {/* Scheduled section */}
          <ScheduledSection rows={filteredScheduled} />

          {/* Paid payments section */}
          {showPaid && (
            <PaidSection rows={filteredPaid} rangeMonths={rangeMonths} />
          )}
        </div>
      )}
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
  billInterval: string;
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

function ScheduledSection({ rows }: { rows: ScheduledRow[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        Scheduled{" "}
        <span className="font-normal normal-case text-gray-300">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <EmptyState message="No pending or overdue payments." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Expense</Th>
                <Th>Vendor</Th>
                <Th>Due Date</Th>
                <Th right>Amount Due</Th>
                <Th right>Paid So Far</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.occurrenceId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to="/bills/$id"
                      params={{ id: row.billId }}
                      className="inline-flex items-center gap-1 font-medium text-sm text-blue-600 hover:underline"
                    >
                      {row.billName}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </Link>
                    {row.notes && (
                      <div className="text-xs text-gray-400 truncate max-w-xs">{row.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.vendorName ?? <Dash />}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {format(parseISO(row.dueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                    {formatCurrency(row.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                    {row.paidAmountCents && row.paidAmountCents > 0 ? (
                      <span className="text-amber-600">{formatCurrency(row.paidAmountCents)}</span>
                    ) : (
                      <Dash />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
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
  billInterval: string;
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

function PaidSection({ rows, rangeMonths }: { rows: PaidRow[]; rangeMonths: number }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        Paid Payments — last {rangeMonths} {rangeMonths === 1 ? "month" : "months"}{" "}
        <span className="font-normal normal-case text-gray-300">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <EmptyState message={`No payments recorded in the last ${rangeMonths} ${rangeMonths === 1 ? "month" : "months"}.`} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Expense</Th>
                <Th>Vendor</Th>
                <Th>Due Date</Th>
                <Th>Payment Date</Th>
                <Th right>Amount Paid</Th>
                <Th right>Occurrence Total</Th>
                <Th>Occurrence Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.paymentId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to="/bills/$id"
                      params={{ id: row.billId }}
                      className="inline-flex items-center gap-1 font-medium text-sm text-blue-600 hover:underline"
                    >
                      {row.billName}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </Link>
                    {row.paymentNotes && (
                      <div className="text-xs text-gray-400 truncate max-w-xs">{row.paymentNotes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.vendorName ?? <Dash />}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {format(parseISO(row.occurrenceDueDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {format(parseISO(row.paidDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-green-700 whitespace-nowrap">
                    {formatCurrency(row.paymentAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                    {formatCurrency(row.occurrenceAmountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.occurrenceStatus} />
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
        "px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500",
        right ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function Dash() {
  return <span className="text-gray-300">—</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
      <CreditCard className="mb-3 h-8 w-8 text-gray-300" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
