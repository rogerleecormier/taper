"use client";

import { useMemo, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { TrendingUp, Receipt, Loader2, Eye, EyeOff } from "lucide-react";
import { useTrackerData } from "~/hooks/use-tracker";
import { useReorderBills } from "~/hooks/use-bills";
import { useReorderIncomeSources } from "~/hooks/use-income";
import { setTrackerInterval, setTrackerPeriodStart } from "~/store/tracker-store";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import type { TrackerInterval } from "~/lib/dates";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import { TrackerToolbar } from "./tracker-toolbar";
import { TrackerParentRow } from "./tracker-parent-row";

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

  const billRows = useMemo(() => rows.filter((r) => r.type === "bill"), [rows]);
  const incomeRows = useMemo(() => rows.filter((r) => r.type === "income"), [rows]);

  // Local DnD order — optimistic, synced from server data
  const [billOrder, setBillOrder] = useState<string[]>(() => billRows.map((r) => r.id));
  const [incomeOrder, setIncomeOrder] = useState<string[]>(() => incomeRows.map((r) => r.id));

  const billKey = billRows.map((r) => r.id).join(",");
  const incomeKey = incomeRows.map((r) => r.id).join(",");
  useEffect(() => setBillOrder(billRows.map((r) => r.id)), [billKey]);
  useEffect(() => setIncomeOrder(incomeRows.map((r) => r.id)), [incomeKey]);

  const reorderBills = useReorderBills();
  const reorderIncome = useReorderIncomeSources();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleBillDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = billOrder.indexOf(String(active.id));
    const newIdx = billOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(billOrder, oldIdx, newIdx);
    setBillOrder(next);
    reorderBills.mutate(next.map((id) => id.split(":")[1]));
  }

  function handleIncomeDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = incomeOrder.indexOf(String(active.id));
    const newIdx = incomeOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(incomeOrder, oldIdx, newIdx);
    setIncomeOrder(next);
    reorderIncome.mutate(next.map((id) => id.split(":")[1]));
  }

  // Build parent items — attach their occurrence arrays for the current period
  const incomeParents = useMemo(
    () =>
      incomeOrder
        .map((dndId) => {
          const row = incomeRows.find((r) => r.id === dndId);
          if (!row) return null;
          const entityId = dndId.split(":")[1];
          const occs = Array.from(incomeOccurrenceMap.get(entityId)?.values() ?? []).sort(
            (a, b) => a.expectedDate.localeCompare(b.expectedDate)
          ) as IncomeOccurrence[];
          const periodTotal = occs.reduce((s, o) => s + o.amountCents, 0);
          return { ...row, entityId, occurrences: occs, periodTotal };
        })
        .filter(Boolean),
    [incomeOrder, incomeRows, incomeOccurrenceMap]
  );

  const billParents = useMemo(
    () =>
      billOrder
        .map((dndId) => {
          const row = billRows.find((r) => r.id === dndId);
          if (!row) return null;
          const entityId = dndId.split(":")[1];
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
    [billOrder, billRows, billOccurrenceMap, showPaid]
  );

  const incomeTotal = incomeParents.reduce((s, p) => s + p!.periodTotal, 0);
  const expenseTotal = billParents.reduce((s, p) => s + p!.periodTotal, 0);
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
      <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
        <div className="flex flex-col items-center py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Income
          </span>
          <span className="mt-0.5 text-xl font-bold tabular-nums text-green-600">
            {formatCurrency(incomeTotal)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Expenses
          </span>
          <span className="mt-0.5 text-xl font-bold tabular-nums text-red-600">
            {formatCurrency(expenseTotal)}
          </span>
        </div>
        <div className="flex flex-col items-center py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {balance >= 0 ? "Unallocated" : "Shortfall"}
          </span>
          <span
            className={cn(
              "mt-0.5 text-xl font-bold tabular-nums",
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
              <div className="flex items-center justify-between border-b bg-green-50/70 px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Income
                  </span>
                  <span className="text-xs text-green-600">
                    {incomeParents.length} source{incomeParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-green-700">
                  {formatCurrency(incomeTotal)}
                </span>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleIncomeDragEnd}
              >
                <SortableContext items={incomeOrder} strategy={verticalListSortingStrategy}>
                  {incomeParents.map(
                    (p) =>
                      p && (
                        <TrackerParentRow
                          key={p.id}
                          dndId={p.id}
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
                      )
                  )}
                </SortableContext>
              </DndContext>
            </section>
          )}

          {/* ── Expenses section ── */}
          {billParents.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b bg-red-50/70 px-4 py-1.5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                    Expenses
                  </span>
                  <span className="text-xs text-red-600">
                    {billParents.length} item{billParents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPaid((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                      showPaid
                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-muted bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {showPaid ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    {showPaid ? "Showing All" : "Unpaid Only"}
                  </button>
                  <span className="text-sm font-semibold tabular-nums text-red-700">
                    {formatCurrency(expenseTotal)}
                  </span>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleBillDragEnd}
              >
                <SortableContext items={billOrder} strategy={verticalListSortingStrategy}>
                  {billParents.map(
                    (p) =>
                      p && (
                        <TrackerParentRow
                          key={p.id}
                          dndId={p.id}
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
                </SortableContext>
              </DndContext>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
