import { useMemo } from "react";
import { useBills } from "./use-bills";
import { useIncomeSources } from "./use-income";
import { useBillOccurrences, useIncomeOccurrences } from "./use-occurrences";
import { type BillOccurrence } from "~/db/schema/bill-occurrences";
import { type IncomeOccurrence } from "~/db/schema/income-occurrences";
import { getPeriodEnd, toDateStr, type TrackerInterval } from "~/lib/dates";

export type TrackerRow = {
  id: string;
  type: "bill" | "income";
  name: string;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  amountCents: number;
  interval: string;
  sortOrder: number;
};

export function useTrackerData(interval: TrackerInterval, periodStart: Date) {
  const windowStart = toDateStr(periodStart);
  const windowEnd = toDateStr(getPeriodEnd(interval, periodStart));

  const { data: bills = [], isLoading: billsLoading } = useBills({ isActive: true });
  const { data: incomeSrcs = [], isLoading: incomeLoading } = useIncomeSources();

  const { data: billOccs = [], isLoading: billOccsLoading } = useBillOccurrences({
    startDate: windowStart,
    endDate: windowEnd,
  });

  const { data: incomeOccs = [], isLoading: incomeOccsLoading } = useIncomeOccurrences({
    startDate: windowStart,
    endDate: windowEnd,
  });

  const rows: TrackerRow[] = useMemo(() => {
    const billRows: TrackerRow[] = bills.map((b) => ({
      id: `bill:${b.id}`,
      type: "bill" as const,
      name: b.name,
      vendorName: (b as any).vendor?.name ?? null,
      categoryName: (b as any).category?.name ?? null,
      categoryColor: (b as any).category?.color ?? null,
      amountCents: b.amountCents,
      interval: b.interval,
      sortOrder: b.sortOrder,
    }));

    const incomeRows: TrackerRow[] = incomeSrcs.map((s) => ({
      id: `income:${s.id}`,
      type: "income" as const,
      name: s.name,
      vendorName: (s as any).vendor?.name ?? null,
      categoryName: (s as any).category?.name ?? null,
      categoryColor: (s as any).category?.color ?? null,
      amountCents: s.amountCents,
      interval: s.interval,
      sortOrder: s.sortOrder,
    }));

    return [...billRows, ...incomeRows].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [bills, incomeSrcs]);

  // Build O(1) lookup: entityId → dateStr → occurrence
  const billOccurrenceMap = useMemo(() => {
    const map = new Map<string, Map<string, BillOccurrence>>();
    for (const occ of billOccs) {
      let inner = map.get(occ.billId);
      if (!inner) {
        inner = new Map();
        map.set(occ.billId, inner);
      }
      inner.set(occ.dueDate, occ);
    }
    return map;
  }, [billOccs]);

  const incomeOccurrenceMap = useMemo(() => {
    const map = new Map<string, Map<string, IncomeOccurrence>>();
    for (const occ of incomeOccs) {
      let inner = map.get(occ.incomeSourceId);
      if (!inner) {
        inner = new Map();
        map.set(occ.incomeSourceId, inner);
      }
      inner.set(occ.expectedDate, occ);
    }
    return map;
  }, [incomeOccs]);

  const isLoading =
    billsLoading || incomeLoading || billOccsLoading || incomeOccsLoading;

  return {
    rows,
    billOccurrenceMap,
    incomeOccurrenceMap,
    windowStart,
    windowEnd,
    isLoading,
  };
}
