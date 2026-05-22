"use client";

import { useMemo } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfYear,
  format,
  isAfter,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { CSS } from "@dnd-kit/utilities";
import { useBills } from "~/hooks/use-bills";
import { useIncomeSources } from "~/hooks/use-income";
import {
  useBillOccurrences,
  useIncomeOccurrences,
  useUpdateBillOccurrence,
  useUpdateIncomeOccurrence,
} from "~/hooks/use-occurrences";
import { usePreferences } from "~/hooks/use-preferences";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";

export type BudgetScope = "month" | "year";
export type MonthInterval = "day" | "week" | "biweek" | "month" | "pay-period";
export type YearInterval = "month" | "quarter" | "half" | "year";
export type BudgetBoardInterval = MonthInterval | YearInterval;

type Bucket = {
  id: string;
  label: string;
  start: Date;
  end: Date;
};

type BoardOccurrence = {
  id: string;
  type: "bill" | "income";
  parentId: string;
  name: string;
  amountCents: number;
  dateStr: string;
  status: string;
};

function getBuckets(
  scope: BudgetScope,
  interval: BudgetBoardInterval,
  periodStart: Date,
  paydayInterval: "weekly" | "biweekly" = "biweekly"
): Bucket[] {
  if (scope === "month") {
    if (interval === "pay-period") {
      const days = paydayInterval === "weekly" ? 7 : 14;
      const end = addDays(periodStart, days - 1);
      return [
        {
          id: toDateStr(periodStart),
          label: `${format(periodStart, "MMM d")} – ${format(end, "MMM d")}`,
          start: periodStart,
          end,
        },
      ];
    }

    const monthStart = startOfMonth(periodStart);
    const monthEnd = endOfMonth(periodStart);

    if (interval === "day") {
      const buckets: Bucket[] = [];
      let cursor = monthStart;
      while (!isAfter(cursor, monthEnd)) {
        buckets.push({
          id: toDateStr(cursor),
          label: format(cursor, "MMM d"),
          start: cursor,
          end: cursor,
        });
        cursor = addDays(cursor, 1);
      }
      return buckets;
    }

    if (interval === "week" || interval === "biweek") {
      const step = interval === "week" ? 7 : 14;
      const buckets: Bucket[] = [];
      let cursor = monthStart;
      while (!isAfter(cursor, monthEnd)) {
        const end = addDays(cursor, step - 1);
        buckets.push({
          id: toDateStr(cursor),
          label: `${format(cursor, "MMM d")} - ${format(end, "MMM d")}`,
          start: cursor,
          end,
        });
        cursor = addDays(cursor, step);
      }
      return buckets;
    }

    return [
      {
        id: toDateStr(monthStart),
        label: format(monthStart, "MMMM yyyy"),
        start: monthStart,
        end: monthEnd,
      },
    ];
  }

  const yearStart = startOfYear(periodStart);
  const yearEnd = endOfYear(periodStart);

  if (interval === "month") {
    return Array.from({ length: 12 }).map((_, i) => {
      const start = addMonths(yearStart, i);
      return {
        id: toDateStr(start),
        label: format(start, "MMM"),
        start,
        end: endOfMonth(start),
      };
    });
  }

  if (interval === "quarter") {
    return Array.from({ length: 4 }).map((_, i) => {
      const start = addMonths(yearStart, i * 3);
      const end = endOfMonth(addMonths(start, 2));
      return {
        id: toDateStr(start),
        label: `Q${i + 1}`,
        start,
        end,
      };
    });
  }

  if (interval === "half") {
    return [
      {
        id: toDateStr(yearStart),
        label: "H1",
        start: yearStart,
        end: endOfMonth(addMonths(yearStart, 5)),
      },
      {
        id: toDateStr(addMonths(yearStart, 6)),
        label: "H2",
        start: addMonths(yearStart, 6),
        end: yearEnd,
      },
    ];
  }

  return [
    {
      id: toDateStr(yearStart),
      label: format(yearStart, "yyyy"),
      start: yearStart,
      end: yearEnd,
    },
  ];
}

function getBucketIdForDate(dateStr: string, buckets: Bucket[]): string | null {
  const d = startOfDay(parseISO(dateStr));
  for (const bucket of buckets) {
    const start = startOfDay(bucket.start);
    const end = startOfDay(bucket.end);
    if (d >= start && d <= end) return bucket.id;
  }
  return null;
}

function DraggableCard({ item }: { item: BoardOccurrence }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-md border border-border bg-card p-3 text-xs shadow-xs transition-all hover:border-accent/50 active:cursor-grabbing",
        isDragging && "opacity-50 border-accent scale-95"
      )}
    >
      <div className="font-bold text-foreground">{item.name}</div>
      <div className="mt-0.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{item.dateStr}</div>
      <div className={cn("mt-1.5 font-extrabold text-sm tabular-nums", item.type === "income" ? "text-success" : "text-danger")}>
        {formatCurrency(item.amountCents)}
      </div>
    </div>
  );
}

function DropBucket({
  bucket,
  items,
}: {
  bucket: Bucket;
  items: BoardOccurrence[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: bucket.id,
    data: { bucketStart: toDateStr(bucket.start) },
  });

  return (
    <div className="min-w-72 flex-1">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/90">{bucket.label}</div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[300px] space-y-2.5 rounded-lg border border-border bg-muted/20 p-3 transition-colors",
          isOver && "border-accent/50 bg-accent/5"
        )}
      >
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

interface BudgetBoardViewProps {
  scope: BudgetScope;
  interval: BudgetBoardInterval;
  periodStart: Date;
}

export function BudgetBoardView({ scope, interval, periodStart }: BudgetBoardViewProps) {
  const { data: prefs } = usePreferences();
  const paydayInterval = prefs?.paydayInterval ?? "biweekly";

  const buckets = useMemo(
    () => getBuckets(scope, interval, periodStart, paydayInterval),
    [scope, interval, periodStart, paydayInterval]
  );

  const windowStart = toDateStr(buckets[0]?.start ?? periodStart);
  const windowEnd = toDateStr(buckets[buckets.length - 1]?.end ?? periodStart);

  const { data: bills = [] } = useBills({ isActive: true });
  const { data: incomeSources = [] } = useIncomeSources();
  const { data: billOccs = [] } = useBillOccurrences({ startDate: windowStart, endDate: windowEnd });
  const { data: incomeOccs = [] } = useIncomeOccurrences({ startDate: windowStart, endDate: windowEnd });
  const updateBillOccurrence = useUpdateBillOccurrence();
  const updateIncomeOccurrence = useUpdateIncomeOccurrence();

  const billNameMap = useMemo(
    () => new Map(bills.map((b) => [b.id, b.name])),
    [bills]
  );
  const incomeNameMap = useMemo(
    () => new Map(incomeSources.map((s) => [s.id, s.name])),
    [incomeSources]
  );

  const items = useMemo(() => {
    const billItems: BoardOccurrence[] = billOccs.map((o) => ({
      id: o.id,
      type: "bill",
      parentId: o.billId,
      name: billNameMap.get(o.billId) ?? "Expense",
      amountCents: o.amountCents,
      dateStr: o.dueDate,
      status: o.status,
    }));

    const incomeItems: BoardOccurrence[] = incomeOccs.map((o) => ({
      id: o.id,
      type: "income",
      parentId: o.incomeSourceId,
      name: incomeNameMap.get(o.incomeSourceId) ?? "Income",
      amountCents: o.amountCents,
      dateStr: o.expectedDate,
      status: o.status,
    }));

    return [...incomeItems, ...billItems];
  }, [billOccs, incomeOccs, billNameMap, incomeNameMap]);

  const bucketItems = useMemo(() => {
    const map = new Map<string, BoardOccurrence[]>();
    for (const bucket of buckets) map.set(bucket.id, []);
    for (const item of items) {
      const bucketId = getBucketIdForDate(item.dateStr, buckets);
      if (!bucketId) continue;
      map.get(bucketId)?.push(item);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    }
    return map;
  }, [items, buckets]);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const item = active.data.current as BoardOccurrence | undefined;
    const bucketStart = over.data.current?.bucketStart as string | undefined;
    if (!item || !bucketStart) return;
    if (item.dateStr === bucketStart) return;

    if (item.type === "bill") {
      await updateBillOccurrence.mutateAsync({ id: item.id, dueDate: bucketStart });
      return;
    }
    await updateIncomeOccurrence.mutateAsync({ id: item.id, expectedDate: bucketStart });
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3 p-1">
          {buckets.map((bucket) => (
            <DropBucket
              key={bucket.id}
              bucket={bucket}
              items={bucketItems.get(bucket.id) ?? []}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
