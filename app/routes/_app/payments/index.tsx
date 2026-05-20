import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CreditCard } from "lucide-react";
import { usePaymentsPageData } from "~/hooks/use-occurrences";
import { formatCurrency } from "~/lib/currency";
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

function PaymentsPage() {
  const [showPaid, setShowPaid] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  const { data = [], isLoading, isError } = usePaymentsPageData({ includePaid: showPaid });

  const vendors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of data) {
      if (row.vendorId && row.vendorName) {
        seen.set(row.vendorId, row.vendorName);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filtered = useMemo(() => {
    if (vendorFilter === "all") return data;
    if (vendorFilter === "__none__") return data.filter((r) => !r.vendorId);
    return data.filter((r) => r.vendorId === vendorFilter);
  }, [data, vendorFilter]);

  const scheduled = useMemo(
    () => filtered.filter((r) => r.status === "pending" || r.status === "partial" || r.status === "overdue"),
    [filtered]
  );

  const paid = useMemo(
    () => filtered.filter((r) => r.status === "paid" || r.status === "skipped" || r.status === "carried"),
    [filtered]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          All scheduled and completed bill payments.
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
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
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
          Show paid / completed
        </label>
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
        <div className="space-y-8">
          {/* Scheduled section */}
          <Section
            title="Scheduled"
            rows={scheduled}
            emptyMessage={
              vendorFilter !== "all"
                ? "No scheduled payments for this vendor."
                : "No pending, partial, or overdue payments."
            }
          />

          {/* Paid / completed section — only when toggle is on */}
          {showPaid && (
            <Section
              title="Paid & Completed"
              rows={paid}
              emptyMessage={
                vendorFilter !== "all"
                  ? "No paid payments for this vendor."
                  : "No paid or completed payments."
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

type PaymentRow = {
  id: string;
  billId: string;
  dueDate: string;
  amountCents: number;
  paidAmountCents: number | null;
  status: OccurrenceStatus;
  paidDate: string | null;
  notes: string | null;
  carriedFromId: string | null;
  billName: string;
  billInterval: string;
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

function Section({ title, rows, emptyMessage }: { title: string; rows: PaymentRow[]; emptyMessage: string }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        {title} <span className="ml-1 text-gray-300 font-normal normal-case">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
          <CreditCard className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Expense
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Due Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Amount Due
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <PaymentTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaymentTableRow({ row }: { row: PaymentRow }) {
  const remaining = row.amountCents - (row.paidAmountCents ?? 0);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-gray-900">{row.billName}</div>
        {row.notes && (
          <div className="text-xs text-gray-400 truncate max-w-xs">{row.notes}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {row.vendorName ?? <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
        {format(parseISO(row.dueDate), "MMM d, yyyy")}
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
        {formatCurrency(row.amountCents)}
      </td>
      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
        {row.paidAmountCents && row.paidAmountCents > 0 ? (
          <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>
            {formatCurrency(row.paidAmountCents)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}
