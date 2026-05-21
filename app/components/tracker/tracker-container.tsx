"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Receipt, Loader2, Eye, EyeOff, BadgeDollarSign } from "lucide-react";
import { useTrackerData } from "~/hooks/use-tracker";
import { setTrackerInterval, setTrackerPeriodStart } from "~/store/tracker-store";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import type { TrackerInterval } from "~/lib/dates";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";
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
const TOTALLED_CREDIT_STATUSES = new Set(["pending", "partial", "overdue", "received"]);

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
    creditOccurrenceMap,
    billPaymentsByOccurrenceMap,
    creditReceiptsByOccurrenceMap,
    isLoading,
  } = useTrackerData(interval, periodStart);

  const [showReceived, setShowReceived] = useState(false);
  const [showCarried, setShowCarried] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>("__all__");

  const billRows = useMemo(() => rows.filter((r) => r.type === "bill"), [rows]);
  const incomeRows = useMemo(() => rows.filter((r) => r.type === "income"), [rows]);
  const creditRows = useMemo(() => rows.filter((r) => r.type === "credit"), [rows]);

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
          ).sort((a, b) => a.dueDate.localeCompare(b.dueDate)) as BillOccurrence[];
          const visibleOccs = allOccs.filter((o) => {
            // Intermediate carry: was itself deferred again — hide from all weeks
            if (o.status === "carried" && o.carriedFromId) return false;
            // Origin carry: the original occurrence that was deferred — hide when toggle is off
            if (!showCarried && o.status === "carried") return false;
            return true;
          });
          if (visibleOccs.length === 0) return null;
          const periodTotal = allOccs
            .filter((o) => TOTALLED_BILL_STATUSES.has(o.status))
            .reduce((s, o) => s + o.amountCents, 0);
          return { ...row, entityId, occurrences: visibleOccs, periodTotal };
        })
        .filter(Boolean),
    [billRows, billOccurrenceMap, showCarried]
  );

  const creditParents = useMemo(
    () =>
      creditRows
        .map((row) => {
          const entityId = row.id.split(":")[1];
          const allOccs = Array.from(
            creditOccurrenceMap.get(entityId)?.values() ?? []
          ).sort((a, b) => a.dueDate.localeCompare(b.dueDate)) as CreditOccurrence[];
          const visibleOccs = allOccs.filter((o) => {
            // Intermediate carry: always hide
            if (o.status === "carried" && o.carriedFromId) return false;
            // Pending-only filter (hides received and origin carries)
            if (!showReceived && !UNPAID_STATUSES.has(o.status)) return false;
            return true;
          });
          if (visibleOccs.length === 0) return null;
          const periodTotal = allOccs
            .filter((o) => TOTALLED_CREDIT_STATUSES.has(o.status))
            .reduce((s, o) => s + o.amountCents, 0);
          return { ...row, entityId, occurrences: visibleOccs, periodTotal };
        })
        .filter(Boolean),
    [creditRows, creditOccurrenceMap, showReceived]
  );

  const vendorOptions = useMemo(() => {
    const allVendors = new Set<string>();
    [...billParents, ...incomeParents, ...creditParents].forEach((p) => {
      if (p?.vendorName) allVendors.add(p.vendorName);
    });
    return Array.from(allVendors).sort((a, b) => a.localeCompare(b));
  }, [billParents, incomeParents, creditParents]);

  const filteredBillParents = useMemo(() => {
    if (selectedVendor === "__all__") return billParents;
    if (selectedVendor === "__none__") return billParents.filter((p) => p && !p.vendorName);
    return billParents.filter((p) => p?.vendorName === selectedVendor);
  }, [billParents, selectedVendor]);

  const filteredIncomeParents = useMemo(() => {
    if (selectedVendor === "__all__") return incomeParents;
    if (selectedVendor === "__none__") return incomeParents.filter((p) => !p.vendorName);
    return incomeParents.filter((p) => p.vendorName === selectedVendor);
  }, [incomeParents, selectedVendor]);

  const filteredCreditParents = useMemo(() => {
    if (selectedVendor === "__all__") return creditParents;
    if (selectedVendor === "__none__") return creditParents.filter((p) => p && !p.vendorName);
    return creditParents.filter((p) => p?.vendorName === selectedVendor);
  }, [creditParents, selectedVendor]);

  const incomeTotal = filteredIncomeParents.reduce((s, p) => s + p!.periodTotal, 0);
  const expenseTotal = filteredBillParents.reduce((s, p) => s + p!.periodTotal, 0);
  const creditTotal = filteredCreditParents.reduce((s, p) => s + p!.periodTotal, 0);
  const balance = incomeTotal + creditTotal - expenseTotal;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tracker…
      </div>
    );
  }

  const isEmpty = rows.length === 0;
  const hasFilteredContent =
    filteredIncomeParents.length > 0 ||
    filteredBillParents.length > 0 ||
    filteredCreditParents.length > 0;

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
      <div className={cn("divide-x border-b bg-gray-50", creditTotal > 0 ? "grid grid-cols-4" : "grid grid-cols-3")}>
        <div className="flex flex-col items-center py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Income
          </span>
          <span className="mt-1 text-xl font-bold tabular-nums text-green-600">
            {formatCurrency(incomeTotal)}
          </span>
        </div>
        {creditTotal > 0 && (
          <div className="flex flex-col items-center py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Credits
            </span>
            <span className="mt-1 text-xl font-bold tabular-nums text-teal-600">
              {formatCurrency(creditTotal)}
            </span>
          </div>
        )}
        <div className="flex flex-col items-center py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Expenses
          </span>
          <span className="mt-1 text-xl font-bold tabular-nums text-red-600">
            -{formatCurrency(expenseTotal)}
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

      {/* Vendor filter bar */}
      {vendorOptions.length > 0 && (
        <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
          <span className="text-xs text-muted-foreground shrink-0">Vendor:</span>
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="h-7 w-48 text-xs">
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
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nothing to track yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Add income sources, expenses, and credits — they'll appear here with
            their scheduled occurrences for each period.
          </p>
        </div>
      ) : !hasFilteredContent ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
          No transactions for this vendor in the current period.
        </div>
      ) : (
        <div className="divide-y overflow-y-auto">
          {/* ── Income section ── */}
          {filteredIncomeParents.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b bg-green-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                    Income
                  </span>
                  <span className="text-xs text-green-600/70">
                    {filteredIncomeParents.length} source{filteredIncomeParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-green-700">
                  {formatCurrency(incomeTotal)}
                </span>
              </div>

              {filteredIncomeParents.map((p) => (
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
          {filteredBillParents.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b bg-red-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
                    Expenses
                  </span>
                  <span className="text-xs text-red-600/70">
                    {filteredBillParents.length} item{filteredBillParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-red-700">
                    -{formatCurrency(expenseTotal)}
                  </span>
                  <button
                    onClick={() => setShowCarried((v) => !v)}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      !showCarried
                        ? "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "border-gray-200 bg-white text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {!showCarried ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {!showCarried ? "Show Carried" : "Hide Carried"}
                    </span>
                    <span className="sm:hidden">Carried</span>
                  </button>
                </div>
              </div>

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

          {/* ── Credits section ── */}
          {filteredCreditParents.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b bg-teal-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <BadgeDollarSign className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    Credits
                  </span>
                  <span className="text-xs text-teal-600/70">
                    {filteredCreditParents.length} item{filteredCreditParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-teal-700">
                    {formatCurrency(creditTotal)}
                  </span>
                  <button
                    onClick={() => setShowReceived((v) => !v)}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      showReceived
                        ? "border-teal-200 bg-teal-100 text-teal-700 hover:bg-teal-200"
                        : "border-gray-200 bg-white text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {showReceived ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{showReceived ? "Showing All" : "Pending Only"}</span>
                    <span className="sm:hidden">{showReceived ? "All" : "Pending"}</span>
                  </button>
                </div>
              </div>

              {filteredCreditParents.map(
                (p) =>
                  p && (
                    <TrackerParentRow
                      key={p.id}
                      id={p.id}
                      type="credit"
                      name={p.name}
                      interval={p.interval}
                      defaultAmountCents={p.amountCents}
                      periodTotal={p.periodTotal}
                      categoryName={p.categoryName}
                      categoryColor={p.categoryColor}
                      vendorName={p.vendorName}
                      occurrences={p.occurrences}
                      receiptsByOccurrenceId={creditReceiptsByOccurrenceMap}
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
