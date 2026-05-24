"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Receipt, Loader2, Eye, EyeOff, BadgeDollarSign, Target, Calendar, PieChart, Layers } from "lucide-react";
import { useTrackerData } from "~/hooks/use-tracker";
import { setTrackerInterval, setTrackerPeriodStart } from "~/store/tracker-store";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import type { TrackerInterval } from "~/lib/dates";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { CreditReceipt } from "~/db/schema/credit-receipts";
import { TrackerToolbar } from "./tracker-toolbar";
import { TrackerOccurrenceRow } from "./tracker-occurrence-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent } from "~/components/ui/card";

const UNPAID_STATUSES = new Set(["pending", "partial", "overdue"]);
const TOTALLED_BILL_STATUSES = new Set(["pending", "partial", "overdue", "paid"]);
const TOTALLED_CREDIT_STATUSES = new Set(["pending", "partial", "overdue", "received"]);

type AnyOcc = BillOccurrence | IncomeOccurrence | CreditOccurrence;

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
  const [activeTab, setActiveTab] = useState<"timeline" | "categories">("timeline");

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
            if (o.status === "carried" && o.carriedFromId) return false;
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
            if (o.status === "carried" && o.carriedFromId) return false;
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

  // Chronological timeline compile
  const timelineOccurrences = useMemo(() => {
    // Build a flat map of all bill occurrences for originalDueDate resolution
    const allBillOccs = new Map<string, BillOccurrence>();
    filteredBillParents.forEach((p) => {
      if (!p) return;
      // Include all occurrences (even carried ones) for chain resolution
      Array.from(billOccurrenceMap.get(p.entityId)?.values() ?? []).forEach((o) => {
        allBillOccs.set(o.id, o as BillOccurrence);
      });
    });

    function resolveOriginalDueDate(occ: BillOccurrence): string | null {
      if (!occ.carriedFromId) return null;
      let current = allBillOccs.get(occ.carriedFromId);
      let original = current?.dueDate ?? null;
      while (current?.carriedFromId) {
        const parent = allBillOccs.get(current.carriedFromId);
        if (!parent) break;
        original = parent.dueDate;
        current = parent;
      }
      return original;
    }

    const list: Array<{
      occurrence: AnyOcc;
      type: "income" | "bill" | "credit";
      parentName: string;
      interval: string;
      categoryName: string | null;
      categoryColor: string | null;
      vendorName: string | null;
      dateStr: string;
      payments: BillPayment[];
      receipts: CreditReceipt[];
      originalDueDate?: string | null;
    }> = [];

    filteredIncomeParents.forEach((p) => {
      p.occurrences.forEach((occ) => {
        list.push({
          occurrence: occ,
          type: "income",
          parentName: p.name,
          interval: p.interval,
          categoryName: p.categoryName,
          categoryColor: p.categoryColor,
          vendorName: p.vendorName,
          dateStr: occ.expectedDate,
          payments: [],
          receipts: [],
        });
      });
    });

    filteredBillParents.forEach((p) => {
      if (!p) return;
      p.occurrences.forEach((occ) => {
        const billOcc = occ as BillOccurrence;
        list.push({
          occurrence: occ,
          type: "bill",
          parentName: p.name,
          interval: p.interval,
          categoryName: p.categoryName,
          categoryColor: p.categoryColor,
          vendorName: p.vendorName,
          dateStr: occ.dueDate,
          payments: billPaymentsByOccurrenceMap?.get(occ.id) ?? [],
          receipts: [],
          originalDueDate: resolveOriginalDueDate(billOcc),
        });
      });
    });

    filteredCreditParents.forEach((p) => {
      if (!p) return;
      p.occurrences.forEach((occ) => {
        list.push({
          occurrence: occ,
          type: "credit",
          parentName: p.name,
          interval: p.interval,
          categoryName: p.categoryName,
          categoryColor: p.categoryColor,
          vendorName: p.vendorName,
          dateStr: occ.dueDate,
          payments: [],
          receipts: creditReceiptsByOccurrenceMap?.get(occ.id) ?? [],
        });
      });
    });

    return list.sort((a, b) => {
      const cmp = a.dateStr.localeCompare(b.dateStr);
      if (cmp !== 0) return cmp;
      const score = { income: 0, credit: 1, bill: 2 };
      return score[a.type] - score[b.type];
    });
  }, [filteredIncomeParents, filteredBillParents, filteredCreditParents, billPaymentsByOccurrenceMap, creditReceiptsByOccurrenceMap, billOccurrenceMap]);

  // Category allocations compiler
  const categoryAllocations = useMemo(() => {
    const map = new Map<string, {
      name: string;
      color: string;
      allocatedCents: number;
      spentCents: number;
      creditsCents: number;
    }>();

    const defaultColor = "oklch(0.50 0.18 285)";

    filteredBillParents.forEach((p) => {
      if (!p) return;
      const catKey = p.categoryName ?? "General Expenses";
      const catColor = p.categoryColor ?? defaultColor;

      let spent = 0;
      p.occurrences.forEach((o) => {
        if (o.status === "paid") {
          spent += o.amountCents;
        } else if (o.status === "partial") {
          const payments = billPaymentsByOccurrenceMap?.get(o.id) ?? [];
          spent += payments.reduce((sum, pay) => sum + pay.amountCents, 0);
        }
      });

      const existing = map.get(catKey) ?? { name: catKey, color: catColor, allocatedCents: 0, spentCents: 0, creditsCents: 0 };
      existing.allocatedCents += p.periodTotal;
      existing.spentCents += spent;
      map.set(catKey, existing);
    });

    filteredCreditParents.forEach((p) => {
      if (!p) return;
      const catKey = p.categoryName ?? "General Credits";
      const catColor = p.categoryColor ?? defaultColor;

      let received = 0;
      p.occurrences.forEach((o) => {
        if (o.status === "received") {
          received += o.amountCents;
        } else if (o.status === "partial") {
          const receipts = creditReceiptsByOccurrenceMap?.get(o.id) ?? [];
          received += receipts.reduce((sum, rec) => sum + rec.amountCents, 0);
        }
      });

      const existing = map.get(catKey) ?? { name: catKey, color: catColor, allocatedCents: 0, spentCents: 0, creditsCents: 0 };
      existing.creditsCents += p.periodTotal;
      map.set(catKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.allocatedCents - a.allocatedCents);
  }, [filteredBillParents, filteredCreditParents, billPaymentsByOccurrenceMap, creditReceiptsByOccurrenceMap]);

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Loading Taper Ledger…
      </div>
    );
  }

  const isEmpty = rows.length === 0;
  const hasFilteredContent = timelineOccurrences.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {showToolbar && (
        <TrackerToolbar
          interval={interval}
          periodStart={periodStart}
          onIntervalChange={setTrackerInterval}
          onPeriodChange={setTrackerPeriodStart}
        />
      )}

      {/* Glassmorphic Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Income</p>
              <p className="mt-1 text-lg font-black text-success tabular-nums">{formatCurrency(incomeTotal)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Credits</p>
              <p className="mt-1 text-lg font-black text-accent tabular-nums">{formatCurrency(creditTotal)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <BadgeDollarSign className="h-5 w-5 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Expenses</p>
              <p className="mt-1 text-lg font-black text-destructive tabular-nums">-{formatCurrency(expenseTotal)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border bg-card shadow-xs", balance === 0 ? "border-success/30 bg-success/5" : "border-border")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {balance >= 0 ? "Left to Taper" : "Shortfall"}
              </p>
              <p
                className={cn(
                  "mt-1 text-lg font-black tabular-nums",
                  balance === 0 ? "text-success" : balance > 0 ? "text-warning" : "text-destructive"
                )}
              >
                {formatCurrency(Math.abs(balance))}
              </p>
            </div>
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                balance === 0 ? "bg-success/15" : balance > 0 ? "bg-warning/10" : "bg-destructive/10"
              )}
            >
              <Target
                className={cn(
                  "h-5 w-5",
                  balance === 0 ? "text-success" : balance > 0 ? "text-warning" : "text-destructive"
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Area */}
      {(vendorOptions.length > 0 || billRows.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3 glass-card">
          <div className="flex items-center gap-3">
            {vendorOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider">Vendor:</span>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="h-8 w-44 text-xs font-medium bg-background border-border">
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
          </div>

          <div className="flex items-center gap-2">
            {billRows.length > 0 && (
              <button
                onClick={() => setShowCarried((v) => !v)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-bold transition-all duration-200 cursor-pointer",
                  !showCarried
                    ? "border-warning/20 bg-warning/5 text-warning hover:bg-warning/10"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {!showCarried ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>{!showCarried ? "Show Carried" : "Hide Carried"}</span>
              </button>
            )}

            {creditRows.length > 0 && (
              <button
                onClick={() => setShowReceived((v) => !v)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-bold transition-all duration-200 cursor-pointer",
                  showReceived
                    ? "border-accent/20 bg-accent/5 text-accent hover:bg-accent/10"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {showReceived ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>{showReceived ? "Showing All Credits" : "Pending Credits"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Split Layout or Stacked View */}
      {isEmpty ? (
        <Card className="border border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-2xl bg-muted/65 p-4 text-primary">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-extrabold text-lg text-foreground font-heading">No allocations set up yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Add income sources, expenses, or credits. They will align chronologically here to build your visual budget funnel.
            </p>
          </CardContent>
        </Card>
      ) : !hasFilteredContent ? (
        <Card className="border border-border bg-card text-center text-sm text-muted-foreground py-16">
          No ledger entries matching selections in this period.
        </Card>
      ) : (
        <>
          {/* Mobile Tab Toggle */}
          <div className="flex md:hidden rounded-xl border border-border bg-muted p-0.5 w-full">
            <button
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
                activeTab === "timeline" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Timeline Flow
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
                activeTab === "categories" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PieChart className="h-3.5 w-3.5" />
              Category Allocations
            </button>
          </div>

          {/* Core Layout Split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Timeline Column */}
            <div className={cn("md:col-span-7 lg:col-span-8 space-y-2", activeTab !== "timeline" && "hidden md:block")}>
              <div className="flex items-center gap-2 mb-4 pl-1">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground font-heading">Timeline Flow Ledger</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground font-bold tabular-nums">
                  {timelineOccurrences.length}
                </span>
              </div>

              <div className="pt-2">
                {timelineOccurrences.map(({ occurrence, type, parentName, interval, categoryName, categoryColor, vendorName, payments, receipts, originalDueDate }) => (
                  <TrackerOccurrenceRow
                    key={occurrence.id}
                    occurrence={occurrence}
                    type={type}
                    billName={parentName}
                    interval={interval}
                    categoryName={categoryName}
                    categoryColor={categoryColor}
                    vendorName={vendorName}
                    payments={payments}
                    receipts={receipts}
                    originalDueDate={originalDueDate}
                  />
                ))}
              </div>
            </div>

            {/* Categories Budget Allocations Column */}
            <div className={cn("md:col-span-5 lg:col-span-4 space-y-4", activeTab !== "categories" && "hidden md:block")}>
              <div className="flex items-center gap-2 mb-2 pl-1">
                <PieChart className="h-4 w-4 text-primary" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-foreground font-heading">Category Budgets</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground font-bold tabular-nums">
                  {categoryAllocations.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {categoryAllocations.map((cat) => {
                  const hasAllocation = cat.allocatedCents > 0;
                  const ratio = hasAllocation
                    ? Math.min(100, Math.round((cat.spentCents / cat.allocatedCents) * 100))
                    : 0;

                  return (
                    <Card key={cat.name} className="border border-border bg-card shadow-xs transition-shadow duration-150 hover:shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        {/* Title line */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="font-extrabold text-sm text-foreground truncate max-w-[140px] md:max-w-[160px]">{cat.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums font-bold">
                            {formatCurrency(cat.spentCents)} / {formatCurrency(cat.allocatedCents)}
                          </span>
                        </div>

                        {/* Progress meter */}
                        {hasAllocation && (
                          <div className="space-y-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  ratio === 100 ? "bg-success" : ratio > 80 ? "bg-warning" : "bg-primary"
                                )}
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold leading-none pt-0.5">
                              <span>{ratio}% funneled</span>
                              {cat.allocatedCents - cat.spentCents > 0 && (
                                <span>{formatCurrency(cat.allocatedCents - cat.spentCents)} left</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Credits Offset Info */}
                        {cat.creditsCents > 0 && (
                          <div className="text-[10px] font-bold text-accent bg-accent/5 rounded-md px-2 py-1 flex items-center justify-between">
                            <span>Credits Offset:</span>
                            <span className="tabular-nums font-black">{formatCurrency(cat.creditsCents)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
