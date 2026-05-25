"use client";

import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Loader2, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Check, X, Pencil, Minus, HelpCircle, Eye, EyeOff } from "lucide-react";
import { useBills } from "~/hooks/use-bills";
import { useIncomeSources } from "~/hooks/use-income";
import { useCredits } from "~/hooks/use-credits";
import {
  useBillOccurrences,
  useIncomeOccurrences,
  useCreditOccurrences,
  useBillPaymentsForPeriod,
  useCreditReceiptsForPeriod,
  useUpdateBillOccurrence,
  useUpdateIncomeOccurrence,
  useUpdateCreditOccurrence,
} from "~/hooks/use-occurrences";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { TrackerOccurrenceRow } from "./tracker-occurrence-row";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { CreditReceipt } from "~/db/schema/credit-receipts";

export type BudgetScope = "month" | "year";
export type BudgetBoardInterval = "day" | "week" | "biweek" | "month" | "pay-period" | "quarter" | "half" | "year";

interface BudgetCalendarViewProps {
  scope: BudgetScope;
  interval: BudgetBoardInterval;
  periodStart: Date;
}

type CalendarItem = {
  id: string;
  type: "income" | "bill" | "credit";
  name: string;
  amountCents: number;
  dateStr: string;
  status: string;
  categoryColor: string | null;
  interval: string;
  categoryName: string | null;
  vendorName: string | null;
  isPayday?: boolean;
  occurrenceObj: BillOccurrence | IncomeOccurrence | CreditOccurrence;
};

// Compact Draggable Item inside Calendar Day Cell
function DraggableCalendarItem({ item, onClick }: { item: CalendarItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const statusColors = {
    paid: "bg-success/15 border-success/30 text-success",
    received: "bg-success/15 border-success/30 text-success",
    partial: "bg-primary/15 border-primary/30 text-primary",
    pending: "bg-warning/15 border-warning/30 text-warning",
    overdue: "bg-destructive/15 border-destructive/30 text-destructive",
    skipped: "bg-muted/30 border-muted-foreground/20 text-muted-foreground opacity-65",
    carried: "bg-orange/10 border-orange/20 text-orange opacity-95",
  };

  const colorStyle =
    statusColors[item.status as keyof typeof statusColors] ?? statusColors.pending;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // Prevent click when dragging
        if (transform) return;
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "cursor-grab rounded-md border px-1.5 py-0.5 text-[9px] font-bold flex items-center justify-between gap-1 select-none transition-all hover:scale-[1.02] hover:shadow-xs active:cursor-grabbing",
        colorStyle,
        isDragging && "opacity-40 scale-95 border-primary/50"
      )}
    >
      <span className="truncate max-w-[55px] sm:max-w-[80px]">{item.name}</span>
      <span className="tabular-nums shrink-0">
        {item.type === "income" ? "" : "-"}{formatCurrency(item.amountCents)}
      </span>
    </div>
  );
}

// Droppable calendar cell wrapper
function DropDayCell({
  day,
  isCurrentMonth,
  items,
  onItemClick,
  isPayday,
}: {
  day: Date;
  isCurrentMonth: boolean;
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  isPayday: boolean;
}) {
  const dateStr = toDateStr(day);
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { dateStr },
  });

  const isToday = isSameDay(day, new Date());

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[90px] sm:min-h-[110px] border-r border-b border-border/70 p-1.5 flex flex-col gap-1 transition-colors select-none",
        !isCurrentMonth ? "bg-muted/15 opacity-60" : "bg-card/45",
        isToday && "bg-primary/5 border-primary/30",
        isOver && "bg-primary/10 border-primary/40"
      )}
    >
      <div className="flex items-center justify-between px-0.5 text-[10px] font-extrabold text-muted-foreground">
        <span className={cn(
          isToday && "rounded-full bg-primary text-primary-foreground px-1 py-0.2",
          !isToday && isPayday && "rounded-full bg-success/20 text-success ring-1 ring-success/40 px-1 py-0.2"
        )}>
          {format(day, "d")}
        </span>
        {items.length > 0 && (
          <span className="text-[8px] font-medium text-muted-foreground/60">
            {items.length} item{items.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
        {items.map((item) => (
          <DraggableCalendarItem
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
}

export function BudgetCalendarView({ scope, interval, periodStart }: BudgetCalendarViewProps) {
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  // Compute active month calendar days
  const calendarDays = useMemo(() => {
    const startDay = startOfWeek(startOfMonth(periodStart));
    const endDay = endOfWeek(endOfMonth(periodStart));

    const days: Date[] = [];
    let day = startDay;
    while (day <= endDay) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [periodStart]);

  const windowStart = useMemo(() => toDateStr(calendarDays[0]), [calendarDays]);
  const windowEnd = useMemo(() => toDateStr(calendarDays[calendarDays.length - 1]), [calendarDays]);

  // Hook queries
  const { data: bills = [], isLoading: billsLoading } = useBills({ isActive: true });
  const { data: incomeSources = [], isLoading: incomeLoading } = useIncomeSources();
  const { data: credits = [], isLoading: creditsLoading } = useCredits({ isActive: true });

  const { data: billOccs = [], isLoading: billOccsLoading } = useBillOccurrences({
    startDate: windowStart,
    endDate: windowEnd,
  });
  const { data: incomeOccs = [], isLoading: incomeOccsLoading } = useIncomeOccurrences({
    startDate: windowStart,
    endDate: windowEnd,
  });
  const { data: creditOccs = [], isLoading: creditOccsLoading } = useCreditOccurrences({
    startDate: windowStart,
    endDate: windowEnd,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useBillPaymentsForPeriod({
    startDate: windowStart,
    endDate: windowEnd,
  });
  const { data: receipts = [], isLoading: receiptsLoading } = useCreditReceiptsForPeriod({
    startDate: windowStart,
    endDate: windowEnd,
  });

  const updateBillOccurrence = useUpdateBillOccurrence();
  const updateIncomeOccurrence = useUpdateIncomeOccurrence();
  const updateCreditOccurrence = useUpdateCreditOccurrence();

  const billNameMap = useMemo(() => new Map(bills.map((b) => [b.id, b])), [bills]);
  const incomeNameMap = useMemo(() => new Map(incomeSources.map((s) => [s.id, s])), [incomeSources]);
  const creditNameMap = useMemo(() => new Map(credits.map((c) => [c.id, c])), [credits]);

  const paymentsMap = useMemo(() => {
    const map = new Map<string, BillPayment[]>();
    payments.forEach((p) => {
      const arr = map.get(p.occurrenceId) ?? [];
      arr.push(p);
      map.set(p.occurrenceId, arr);
    });
    return map;
  }, [payments]);

  const receiptsMap = useMemo(() => {
    const map = new Map<string, CreditReceipt[]>();
    receipts.forEach((r) => {
      const arr = map.get(r.occurrenceId) ?? [];
      arr.push(r);
      map.set(r.occurrenceId, arr);
    });
    return map;
  }, [receipts]);

  // Aggregate visible items
  const items = useMemo(() => {
    const list: CalendarItem[] = [];

    incomeOccs.forEach((o) => {
      const parent = incomeNameMap.get(o.incomeSourceId);
      list.push({
        id: o.id,
        type: "income",
        name: parent?.name ?? "Income",
        amountCents: o.amountCents,
        dateStr: o.expectedDate,
        status: o.status,
        categoryColor: parent?.category?.color ?? null,
        interval: parent?.interval ?? "monthly",
        categoryName: (parent as any)?.category?.name ?? null,
        vendorName: (parent as any)?.vendor?.name ?? null,
        isPayday: parent?.sourceType === "payroll",
        occurrenceObj: o,
      });
    });

    billOccs.forEach((o) => {
      if (o.status === "carried") return;
      const parent = billNameMap.get(o.billId);
      if (!showHidden && (o.hidden || parent?.hidden)) return;
      list.push({
        id: o.id,
        type: "bill",
        name: parent?.name ?? "Expense",
        amountCents: o.amountCents,
        dateStr: o.dueDate,
        status: o.status,
        categoryColor: parent?.category?.color ?? null,
        interval: parent?.interval ?? "monthly",
        categoryName: (parent as any)?.category?.name ?? null,
        vendorName: (parent as any)?.vendor?.name ?? null,
        occurrenceObj: o,
      });
    });

    creditOccs.forEach((o) => {
      if (o.status === "carried") return;
      const parent = creditNameMap.get(o.creditId);
      list.push({
        id: o.id,
        type: "credit",
        name: parent?.name ?? "Credit",
        amountCents: o.amountCents,
        dateStr: o.dueDate,
        status: o.status,
        categoryColor: parent?.category?.color ?? null,
        interval: parent?.interval ?? "monthly",
        categoryName: (parent as any)?.category?.name ?? null,
        vendorName: (parent as any)?.vendor?.name ?? null,
        occurrenceObj: o,
      });
    });

    return list;
  }, [incomeOccs, billOccs, creditOccs, incomeNameMap, billNameMap, creditNameMap, showHidden]);

  // Map items to date buckets for rendering
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    items.forEach((item) => {
      const list = map.get(item.dateStr) ?? [];
      list.push(item);
      map.set(item.dateStr, list);
    });
    return map;
  }, [items]);

  // Compute payday dates for fast lookup
  const paydayDates = useMemo(() => {
    const s = new Set<string>();
    items.forEach((item) => {
      if (item.isPayday) s.add(item.dateStr);
    });
    return s;
  }, [items]);

  // Reschedule drag-and-drop end handler
  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const item = active.data.current as CalendarItem | undefined;
    const targetDate = over.id as string | undefined;
    if (!item || !targetDate) return;
    if (item.dateStr === targetDate) return;

    if (item.type === "bill") {
      await updateBillOccurrence.mutateAsync({ id: item.id, dueDate: targetDate });
      return;
    }
    if (item.type === "income") {
      await updateIncomeOccurrence.mutateAsync({ id: item.id, expectedDate: targetDate });
      return;
    }
    await updateCreditOccurrence.mutateAsync({ id: item.id, dueDate: targetDate });
  }

  // Find active occurrence payments and receipts for the detail dialog
  const activeDetailData = useMemo(() => {
    if (!activeItem) return null;
    // Reload dynamically from nameMap to fetch updates
    const refreshed = items.find((it) => it.id === activeItem.id);
    if (!refreshed) return null;

    return {
      ...refreshed,
      payments: paymentsMap.get(refreshed.id) ?? [],
      receipts: receiptsMap.get(refreshed.id) ?? [],
    };
  }, [activeItem, items, paymentsMap, receiptsMap]);

  const isLoading =
    billsLoading ||
    incomeLoading ||
    creditsLoading ||
    billOccsLoading ||
    incomeOccsLoading ||
    creditOccsLoading ||
    paymentsLoading ||
    receiptsLoading;

  if (isLoading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Loading Calendar View…
      </div>
    );
  }

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setShowHidden((p) => !p)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            showHidden
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border bg-muted/50 text-muted-foreground hover:border-accent/30 hover:text-accent"
          )}
        >
          {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Hidden
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Days of the Week Header */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/15">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 7x6 Calendar Grid */}
        <div className="grid grid-cols-7 bg-border/20">
          {calendarDays.map((day) => {
            const dateStr = toDateStr(day);
            const isCurrentMonth = isSameMonth(day, periodStart);
            return (
              <DropDayCell
                key={dateStr}
                day={day}
                isCurrentMonth={isCurrentMonth}
                items={itemsByDate.get(dateStr) ?? []}
                onItemClick={setActiveItem}
                isPayday={paydayDates.has(dateStr)}
              />
            );
          })}
        </div>
      </div>

      {/* Detail Dialog exposing Occurrence action states */}
      {activeDetailData && (
        <Dialog open={!!activeItem} onOpenChange={(open) => !open && setActiveItem(null)}>
          <DialogContent className="sm:max-w-xl glass-card">
            <DialogHeader>
              <DialogTitle className="font-heading font-extrabold text-foreground">Reschedule / Manage Allocation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <TrackerOccurrenceRow
                occurrence={activeDetailData.occurrenceObj}
                type={activeDetailData.type}
                billName={activeDetailData.name}
                interval={activeDetailData.interval}
                categoryColor={activeDetailData.categoryColor}
                categoryName={activeDetailData.categoryName}
                vendorName={activeDetailData.vendorName}
                payments={activeDetailData.payments}
                receipts={activeDetailData.receipts}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DndContext>
  );
}
