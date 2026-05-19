"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Receipt, Loader2, Eye, EyeOff } from "lucide-react";
import { useTrackerData } from "~/hooks/use-tracker";
import { setTrackerInterval, setTrackerPeriodStart } from "~/store/tracker-store";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import type { TrackerInterval } from "~/lib/dates";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import { TrackerToolbar } from "./tracker-toolbar";
import { TrackerParentRow } from "./tracker-parent-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const UNPAID_STATUSES = new Set(["pending", "partial", "overdue"]);
const TOTALLED_BILL_STATUSES = new Set(["pending", "partial", "overdue", "paid"]);

interface TrackerContainerProps {
  interval: TrackerInterval;
  periodStart: Date;
  showToolbar?: boolean;
}

export function TrackerContainer({
  interval,
  periodStart,
  showToolbar = true,
}: TrackerContainerProps) {
  const {
    rows,
    billOccurrenceMap,
    incomeOccurrenceMap,
    billPaymentsByOccurrenceMap,
    isLoading,
  } = useTrackerData(interval, periodStart);

  const [showPaid, setShowPaid] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>("__all__");

  const billRows = useMemo(() => rows.filter((r) => r.type === "bill"), [rows]);
  const incomeRows = useMemo(() => rows.filter((r) => r.type === "income"), [rows]);

  // Build parent items — attach their occurrence arrays for the current period
  const incomeParents = useMemo(
    () =>
      incomeRows.map((row) => {
        const entityId = row.id.split(":")[1];
        const occs = Array.from(incomeOccurrenceMap.get(entityId)?.values() ?? []).sort(
          (a, b) => a.expectedDate.localeCompare(b.expectedDate)
        ) as IncomeOccurrence[];
        const periodTotal = occs.reduce((s, o) => s + o.amountCents, 0);
        return { ...row, entityId, occurrences: occs, periodTotal };
      }),
    [incomeRows, incomeOccurrenceMap]
  );

  const billParents = useMemo(
    () =>
      billRows
        .map((row) => {
          const entityId = row.id.split(":")[1];
          const allOccs = Array.from(
            billOccurrenceMap.get(entityId)?.values() ?? []
          ).sort((a, b) =>
            a.dueDate.localeCompare(b.dueDate)
          ) as BillOccurrence[];
          const visibleOccs = showPaid
            ? allOccs
            : allOccs.filter((o) => UNPAID_STATUSES.has(o.status));
          if (visibleOccs.length === 0) return null;
          const periodTotal = allOccs
            .filter((o) => TOTALLED_BILL_STATUSES.has(o.status))
            .reduce((s, o) => s + o.amountCents, 0);
          return { ...row, entityId, occurrences: visibleOccs, periodTotal };
        })
        .filter(Boolean),
    [billRows, billOccurrenceMap, showPaid]
  );

  const vendorOptions = useMemo(() => {
    return Array.from(
      new Set(
        billParents
          .map((p) => p?.vendorName)
          .filter((v): v is string => Boolean(v))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [billParents]);

  const filteredBillParents = useMemo(() => {
    if (selectedVendor === "__all__") return billParents;
    if (selectedVendor === "__none__") {
      return billParents.filter((p) => p && !p.vendorName);
    }
    return billParents.filter((p) => p?.vendorName === selectedVendor);
  }, [billParents, selectedVendor]);

  const incomeTotal = incomeParents.reduce((s, p) => s + p!.periodTotal, 0);
  const expenseTotal = billParents.reduce((s, p) => s + p!.periodTotal, 0);
  const filteredExpenseTotal = filteredBillParents.reduce(
    (s, p) => s + p!.periodTotal,
    0
  );
  const balance = incomeTotal - expenseTotal;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tracker…
      </div>
    );
  }

  const isEmpty = rows.length === 0;

  return (
    <div className="flex flex-col">
      {showToolbar && (
        <TrackerToolbar
          interval={interval}
          periodStart={periodStart}
          onIntervalChange={setTrackerInterval}
          onPeriodChange={setTrackerPeriodStart}
        />
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 divide-x border-b bg-gray-50">
        <div className="flex flex-col items-center py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Income
          </span>
          <span className="mt-1 text-xl font-bold tabular-nums text-green-600">
            {formatCurrency(incomeTotal)}
          </span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Expenses
          </span>
          <span className="mt-1 text-xl font-bold tabular-nums text-red-600">
            {formatCurrency(expenseTotal)}
          </span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {balance >= 0 ? "Unallocated" : "Shortfall"}
          </span>
          <span
            className={cn(
              "mt-1 text-xl font-bold tabular-nums",
              balance === 0 ? "text-blue-600" : balance > 0 ? "text-amber-600" : "text-red-600"
            )}
          >
            {formatCurrency(Math.abs(balance))}
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nothing to track yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Add income sources and expenses — they'll appear here with their
            scheduled occurrences for each period.
          </p>
        </div>
      ) : (
        <div className="divide-y overflow-y-auto">
          {/* ── Income section ── */}
          {incomeParents.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b bg-green-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                    Income
                  </span>
                  <span className="text-xs text-green-600/70">
                    {incomeParents.length} source{incomeParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-green-700">
                  {formatCurrency(incomeTotal)}
                </span>
              </div>

              {incomeParents.map((p) => (
                <TrackerParentRow
                  key={p.id}
                  id={p.id}
                  type="income"
                  name={p.name}
                  interval={p.interval}
                  defaultAmountCents={p.amountCents}
                  periodTotal={p.periodTotal}
                  categoryName={p.categoryName}
                  categoryColor={p.categoryColor}
                  vendorName={p.vendorName}
                  occurrences={p.occurrences}
                />
              ))}
            </section>
          )}

          {/* ── Expenses section ── */}
          {billParents.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b bg-red-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
                    Expenses
                  </span>
                  <span className="text-xs text-red-600/70">
                    {billParents.length} item{billParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-44">
                    <Select
                      value={selectedVendor}
                      onValueChange={setSelectedVendor}
                    >
                      <SelectTrigger className="h-7 border-red-200 bg-white text-xs">
                        <SelectValue placeholder="All vendors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All vendors</SelectItem>
                        <SelectItem value="__none__">No vendor</SelectItem>
                        {vendorOptions.map((vendor) => (
                          <SelectItem key={vendor} value={vendor}>
                            {vendor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => setShowPaid((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      showPaid
                        ? "border-green-200 bg-green-100 text-green-700 hover:bg-green-200"
                        : "border-gray-200 bg-white text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {showPaid ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{showPaid ? "Showing All" : "Unpaid Only"}</span>
                    <span className="sm:hidden">{showPaid ? "All" : "Unpaid"}</span>
                  </button>
                  <span className="text-sm font-semibold tabular-nums text-red-700">
                    {formatCurrency(
                      selectedVendor === "__all__"
                        ? expenseTotal
                        : filteredExpenseTotal
                    )}
                  </span>
                </div>
              </div>

              {selectedVendor !== "__all__" && (
                <div className="border-b bg-red-50/40 px-4 py-1.5 text-xs text-red-700">
                  Vendor total:{" "}
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(filteredExpenseTotal)}
                  </span>
                </div>
              )}

              {filteredBillParents.map(
                (p) =>
                  p && (
                    <TrackerParentRow
                      key={p.id}
                      id={p.id}
                      type="bill"
                      name={p.name}
                      interval={p.interval}
                      defaultAmountCents={p.amountCents}
                      periodTotal={p.periodTotal}
                      categoryName={p.categoryName}
                      categoryColor={p.categoryColor}
                      vendorName={p.vendorName}
                      occurrences={p.occurrences}
                      paymentsByOccurrenceId={billPaymentsByOccurrenceMap}
                    />
                  )
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
