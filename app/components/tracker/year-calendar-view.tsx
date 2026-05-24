"use client";

import { useMemo, useRef, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  Loader2,
  TrendingUp,
  Receipt,
  BadgeDollarSign,
  Target,
} from "lucide-react";
import { useBills } from "~/hooks/use-bills";
import { useIncomeSources } from "~/hooks/use-income";
import { useCredits } from "~/hooks/use-credits";
import {
  useBillOccurrences,
  useIncomeOccurrences,
  useCreditOccurrences,
  useBillPaymentsForPeriod,
  useCreditReceiptsForPeriod,
} from "~/hooks/use-occurrences";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Card, CardContent } from "~/components/ui/card";
import { TrackerOccurrenceRow } from "./tracker-occurrence-row";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { CreditReceipt } from "~/db/schema/credit-receipts";

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

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-success",
  received: "bg-success",
  partial: "bg-primary",
  pending: "bg-warning",
  overdue: "bg-destructive",
  skipped: "bg-muted-foreground/40",
  carried: "bg-orange/50",
};

// ─── Mini Day Cell ────────────────────────────────────────────────────────────

function MiniDayCell({
  day,
  isInMonth,
  isToday,
  items,
  onDayClick,
  isPayday,
}: {
  day: Date;
  isInMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
  onDayClick: () => void;
  isPayday: boolean;
}) {
  const hasItems = items.length > 0;
  const dotItems = items.slice(0, 4);
  const overflow = items.length - 4;

  return (
    <button
      onClick={hasItems ? onDayClick : undefined}
      disabled={!hasItems}
      className={cn(
        "w-full flex flex-col items-center py-0.5 gap-px rounded min-h-[30px] transition-colors",
        !isInMonth && "opacity-20",
        hasItems && "hover:bg-muted/50 cursor-pointer",
        !hasItems && "cursor-default"
      )}
    >
      <span
        className={cn(
          "text-[10px] font-bold leading-none w-[18px] h-[18px] flex items-center justify-center rounded-full",
          isToday
            ? "bg-primary text-primary-foreground"
            : isPayday
            ? "bg-success/20 text-success ring-1 ring-success/40"
            : isInMonth
            ? "text-foreground"
            : "text-muted-foreground"
        )}
      >
        {format(day, "d")}
      </span>
      {hasItems && (
        <div className="flex flex-wrap gap-px justify-center max-w-[18px]">
          {dotItems.map((item) => (
            <span
              key={item.id}
              className={cn(
                "h-[3px] w-[3px] rounded-full shrink-0",
                item.type === "credit" && item.status === "received"
                  ? "bg-accent"
                  : (STATUS_COLORS[item.status] ?? "bg-warning")
              )}
            />
          ))}
          {overflow > 0 && (
            <span className="text-[6px] font-black text-muted-foreground leading-none">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Mini Month Calendar ──────────────────────────────────────────────────────

function MiniMonthCalendar({
  month,
  itemsByDate,
  onDayClick,
  todayStr,
  monthRef,
  paydayDates,
}: {
  month: Date;
  itemsByDate: Map<string, CalendarItem[]>;
  onDayClick: (day: Date, items: CalendarItem[]) => void;
  todayStr: string;
  monthRef: (el: HTMLDivElement | null) => void;
  paydayDates: Set<string>;
}) {
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [month]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let credits = 0;
    let d = startOfMonth(month);
    const end = endOfMonth(month);
    while (d <= end) {
      const dayItems = itemsByDate.get(toDateStr(d)) ?? [];
      dayItems.forEach((item) => {
        if (item.type === "income") income += item.amountCents;
        else if (item.type === "bill") expenses += item.amountCents;
        else credits += item.amountCents;
      });
      d = addDays(d, 1);
    }
    return { income, expenses, credits };
  }, [month, itemsByDate]);

  const today = new Date();
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() &&
    month.getMonth() === today.getMonth();

  const hasAny =
    monthTotals.income > 0 ||
    monthTotals.expenses > 0 ||
    monthTotals.credits > 0;

  return (
    <div ref={monthRef}>
      <Card
        className={cn(
          "overflow-hidden shadow-xs",
          isCurrentMonth && "ring-2 ring-primary/30 border-primary/30"
        )}
      >
        {/* Month header */}
        <div
          className={cn(
            "px-3 py-2 border-b border-border",
            isCurrentMonth ? "bg-primary/5" : "bg-muted/20"
          )}
        >
          <h3
            className={cn(
              "font-extrabold text-sm font-heading leading-none mb-1.5",
              isCurrentMonth ? "text-primary" : "text-foreground"
            )}
          >
            {format(month, "MMMM")}
          </h3>
          <div className="flex items-center gap-2 text-[9px] font-bold tabular-nums flex-wrap">
            {monthTotals.income > 0 && (
              <span className="text-success">
                +{formatCurrency(monthTotals.income)}
              </span>
            )}
            {monthTotals.credits > 0 && (
              <span className="text-accent">
                +{formatCurrency(monthTotals.credits)}
              </span>
            )}
            {monthTotals.expenses > 0 && (
              <span className="text-destructive">
                -{formatCurrency(monthTotals.expenses)}
              </span>
            )}
            {!hasAny && (
              <span className="text-muted-foreground/60">No items</span>
            )}
          </div>
        </div>

        <CardContent className="p-2">
          {/* Day-of-week row */}
          <div className="grid grid-cols-7 mb-0.5">
            {DOW.map((d) => (
              <div
                key={d}
                className="text-center text-[8px] font-black uppercase tracking-wide text-muted-foreground py-0.5"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateStr = toDateStr(day);
              const dayItems = itemsByDate.get(dateStr) ?? [];
              return (
                <MiniDayCell
                  key={dateStr}
                  day={day}
                  isInMonth={isSameMonth(day, month)}
                  isToday={dateStr === todayStr}
                  items={dayItems}
                  onDayClick={() => onDayClick(day, dayItems)}
                  isPayday={paydayDates.has(dateStr)}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Year Calendar View ───────────────────────────────────────────────────────

interface YearCalendarViewProps {
  periodStart: Date;
}

export function YearCalendarView({ periodStart }: YearCalendarViewProps) {
  const year = periodStart.getFullYear();
  const yearStart = toDateStr(new Date(year, 0, 1));
  const yearEnd = toDateStr(new Date(year, 11, 31));
  const todayStr = toDateStr(new Date());

  const [selectedDay, setSelectedDay] = useState<{
    day: Date;
    items: CalendarItem[];
  } | null>(null);

  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data: bills = [], isLoading: billsLoading } = useBills({
    isActive: true,
  });
  const { data: incomeSources = [], isLoading: incomeLoading } =
    useIncomeSources();
  const { data: credits = [], isLoading: creditsLoading } = useCredits({
    isActive: true,
  });

  const { data: billOccs = [], isLoading: billOccsLoading } =
    useBillOccurrences({ startDate: yearStart, endDate: yearEnd });
  const { data: incomeOccs = [], isLoading: incomeOccsLoading } =
    useIncomeOccurrences({ startDate: yearStart, endDate: yearEnd });
  const { data: creditOccs = [], isLoading: creditOccsLoading } =
    useCreditOccurrences({ startDate: yearStart, endDate: yearEnd });

  const { data: payments = [], isLoading: paymentsLoading } =
    useBillPaymentsForPeriod({ startDate: yearStart, endDate: yearEnd });
  const { data: receipts = [], isLoading: receiptsLoading } =
    useCreditReceiptsForPeriod({ startDate: yearStart, endDate: yearEnd });

  const billMap = useMemo(
    () => new Map(bills.map((b) => [b.id, b])),
    [bills]
  );
  const incomeMap = useMemo(
    () => new Map(incomeSources.map((s) => [s.id, s])),
    [incomeSources]
  );
  const creditMap = useMemo(
    () => new Map(credits.map((c) => [c.id, c])),
    [credits]
  );

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

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    const push = (dateStr: string, item: CalendarItem) => {
      const list = map.get(dateStr) ?? [];
      list.push(item);
      map.set(dateStr, list);
    };

    incomeOccs.forEach((o) => {
      const p = incomeMap.get(o.incomeSourceId);
      push(o.expectedDate, {
        id: o.id,
        type: "income",
        name: p?.name ?? "Income",
        amountCents: o.amountCents,
        dateStr: o.expectedDate,
        status: o.status,
        categoryColor: (p as any)?.categoryColor ?? null,
        interval: p?.interval ?? "monthly",
        categoryName: (p as any)?.category?.name ?? null,
        vendorName: (p as any)?.vendor?.name ?? null,
        isPayday: p?.sourceType === "payroll",
        occurrenceObj: o,
      });
    });

    billOccs.forEach((o) => {
      const p = billMap.get(o.billId);
      push(o.dueDate, {
        id: o.id,
        type: "bill",
        name: p?.name ?? "Expense",
        amountCents: o.amountCents,
        dateStr: o.dueDate,
        status: o.status,
        categoryColor: (p as any)?.categoryColor ?? null,
        interval: p?.interval ?? "monthly",
        categoryName: (p as any)?.category?.name ?? null,
        vendorName: (p as any)?.vendor?.name ?? null,
        occurrenceObj: o,
      });
    });

    creditOccs.forEach((o) => {
      const p = creditMap.get(o.creditId);
      push(o.dueDate, {
        id: o.id,
        type: "credit",
        name: p?.name ?? "Credit",
        amountCents: o.amountCents,
        dateStr: o.dueDate,
        status: o.status,
        categoryColor: (p as any)?.categoryColor ?? null,
        interval: p?.interval ?? "monthly",
        categoryName: (p as any)?.category?.name ?? null,
        vendorName: (p as any)?.vendor?.name ?? null,
        occurrenceObj: o,
      });
    });

    return map;
  }, [incomeOccs, billOccs, creditOccs, incomeMap, billMap, creditMap]);

  const paydayDates = useMemo(() => {
    const s = new Set<string>();
    itemsByDate.forEach((items) => {
      items.forEach((item) => {
        if (item.isPayday) s.add(item.dateStr);
      });
    });
    return s;
  }, [itemsByDate]);

  const yearTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let credits = 0;
    itemsByDate.forEach((items) => {
      items.forEach((item) => {
        if (item.type === "income") income += item.amountCents;
        else if (item.type === "bill") expenses += item.amountCents;
        else credits += item.amountCents;
      });
    });
    return {
      income,
      expenses,
      credits,
      balance: income + credits - expenses,
    };
  }, [itemsByDate]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)),
    [year]
  );

  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;
  const todayMonthIndex = today.getMonth();

  function scrollToMonth(index: number) {
    monthRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

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
        Loading {year} Calendar…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Year totals summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {year} Income
              </p>
              <p className="mt-0.5 text-base font-black text-success tabular-nums">
                {formatCurrency(yearTotals.income)}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-success shrink-0" />
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Credits
              </p>
              <p className="mt-0.5 text-base font-black text-accent tabular-nums">
                {formatCurrency(yearTotals.credits)}
              </p>
            </div>
            <BadgeDollarSign className="h-4 w-4 text-accent shrink-0" />
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Expenses
              </p>
              <p className="mt-0.5 text-base font-black text-destructive tabular-nums">
                -{formatCurrency(yearTotals.expenses)}
              </p>
            </div>
            <Receipt className="h-4 w-4 text-destructive shrink-0" />
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {yearTotals.balance >= 0 ? "Balance" : "Shortfall"}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-base font-black tabular-nums",
                  yearTotals.balance >= 0
                    ? "text-warning"
                    : "text-destructive"
                )}
              >
                {formatCurrency(Math.abs(yearTotals.balance))}
              </p>
            </div>
            <Target
              className={cn(
                "h-4 w-4 shrink-0",
                yearTotals.balance >= 0 ? "text-warning" : "text-destructive"
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Month quick-nav strip */}
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-border bg-card/60 px-3 py-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
          Jump to
        </span>
        <div className="flex flex-wrap gap-1">
          {months.map((month, i) => {
            const isCurrent = isCurrentYear && i === todayMonthIndex;
            return (
              <button
                key={i}
                onClick={() => scrollToMonth(i)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {format(month, "MMM")}
              </button>
            );
          })}
        </div>
      </div>

      {/* 12-month grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((month, i) => (
          <MiniMonthCalendar
            key={i}
            month={month}
            itemsByDate={itemsByDate}
            onDayClick={(day, items) => setSelectedDay({ day, items })}
            todayStr={todayStr}
            monthRef={(el) => {
              monthRefs.current[i] = el;
            }}
            paydayDates={paydayDates}
          />
        ))}
      </div>

      {/* Day detail dialog */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-xl glass-card max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading font-extrabold text-foreground">
              {selectedDay &&
                format(selectedDay.day, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 overflow-y-auto flex-1">
            {selectedDay?.items.map((item) => (
              <TrackerOccurrenceRow
                key={item.id}
                occurrence={item.occurrenceObj}
                type={item.type}
                billName={item.name}
                interval={item.interval}
                categoryColor={item.categoryColor}
                categoryName={item.categoryName}
                vendorName={item.vendorName}
                payments={paymentsMap.get(item.id) ?? []}
                receipts={receiptsMap.get(item.id) ?? []}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
