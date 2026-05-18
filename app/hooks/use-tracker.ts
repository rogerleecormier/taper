import { useMemo } from "react";
import { useBills } from "./use-bills";
import { useIncomeSources } from "./use-income";
import { useBillOccurrences, useIncomeOccurrences } from "./use-occurrences";
import { type BillOccurrence } from "~/db/schema/bill-occurrences";
import { type IncomeOccurrence } from "~/db/schema/income-occurrences";
import { getPeriodEnd, toDateStr, type TrackerInterval } from "~/lib/dates";
import { isAfter, isBefore, parseISO } from "date-fns";

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

function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  const date = parseISO(dateStr);
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  return !isBefore(date, start) && !isAfter(date, end);
}

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

  const filteredBillOccs = useMemo(
    () =>
      billOccs.filter((occ) => isDateInRange(occ.dueDate, windowStart, windowEnd)),
    [billOccs, windowStart, windowEnd]
  );

  const filteredIncomeOccs = useMemo(
    () =>
      incomeOccs.filter((occ) =>
        isDateInRange(occ.expectedDate, windowStart, windowEnd)
      ),
    [incomeOccs, windowStart, windowEnd]
  );

  const rows: TrackerRow[] = useMemo(() => {
    const billIdsInWindow = new Set(filteredBillOccs.map((occ) => occ.billId));
    const incomeIdsInWindow = new Set(
      filteredIncomeOccs.map((occ) => occ.incomeSourceId)
    );

    const billRows: TrackerRow[] = bills
      .filter((b) => billIdsInWindow.has(b.id))
      .map((b) => ({
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

    const incomeRows: TrackerRow[] = incomeSrcs
      .filter((s) => incomeIdsInWindow.has(s.id))
      .map((s) => ({
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
  }, [bills, incomeSrcs, filteredBillOccs, filteredIncomeOccs]);

  // Build O(1) lookup: entityId → dateStr → occurrence
  const billOccurrenceMap = useMemo(() => {
    const map = new Map<string, Map<string, BillOccurrence>>();
    for (const occ of filteredBillOccs) {
      let inner = map.get(occ.billId);
      if (!inner) {
        inner = new Map();
        map.set(occ.billId, inner);
      }
      inner.set(occ.dueDate, occ);
    }
    return map;
  }, [filteredBillOccs]);

  const incomeOccurrenceMap = useMemo(() => {
    const map = new Map<string, Map<string, IncomeOccurrence>>();
    for (const occ of filteredIncomeOccs) {
      let inner = map.get(occ.incomeSourceId);
      if (!inner) {
        inner = new Map();
        map.set(occ.incomeSourceId, inner);
      }
      inner.set(occ.expectedDate, occ);
    }
    return map;
  }, [filteredIncomeOccs]);

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
