import { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBills } from "./use-bills";
import { useIncomeSources } from "./use-income";
import { useCredits } from "./use-credits";
import {
  useBillOccurrences,
  useIncomeOccurrences,
  useBillPaymentsForPeriod,
  useCreditOccurrences,
  useCreditReceiptsForPeriod,
  occurrenceKeys,
} from "./use-occurrences";
import { usePreferences } from "./use-preferences";
import { type BillOccurrence } from "~/db/schema/bill-occurrences";
import { type BillPayment } from "~/db/schema/bill-payments";
import { type IncomeOccurrence } from "~/db/schema/income-occurrences";
import { type CreditOccurrence } from "~/db/schema/credit-occurrences";
import { type CreditReceipt } from "~/db/schema/credit-receipts";
import { getPeriodEnd, toDateStr, type TrackerInterval } from "~/lib/dates";
import { isAfter, isBefore, parseISO, addDays, addMonths } from "date-fns";
import { getBillOccurrences } from "~/server/fn/bill-occurrences";
import { getIncomeOccurrences } from "~/server/fn/income-occurrences";
import { getBillPaymentsForPeriod } from "~/server/fn/bill-payments";
import { getCreditOccurrences } from "~/server/fn/credit-occurrences";
import { getCreditReceiptsForPeriod } from "~/server/fn/credit-receipts";

export type TrackerRow = {
  id: string;
  type: "bill" | "income" | "credit";
  name: string;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  amountCents: number;
  interval: string;
  sortOrder: number;
};

const PERIOD_STALE_MS = 5 * 60 * 1000;

function shiftPeriodStart(
  interval: TrackerInterval,
  start: Date,
  n: 1 | -1,
  paydayInterval: "weekly" | "biweekly" = "biweekly"
): Date {
  switch (interval) {
    case "daily":
      return addDays(start, n);
    case "weekly":
      return addDays(start, n * 7);
    case "biweekly":
      return addDays(start, n * 14);
    case "monthly":
      return addMonths(start, n);
    case "yearly":
      return addMonths(start, n * 12);
    case "pay-period":
      return addDays(start, n * (paydayInterval === "weekly" ? 7 : 14));
  }
}

function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  const date = parseISO(dateStr);
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  return !isBefore(date, start) && !isAfter(date, end);
}

export function useTrackerData(interval: TrackerInterval, periodStart: Date) {
  const { data: prefs } = usePreferences();
  const paydayInterval = prefs?.paydayInterval ?? "biweekly";

  const windowStart = toDateStr(periodStart);
  const windowEnd = toDateStr(getPeriodEnd(interval, periodStart, paydayInterval));

  const { data: bills = [], isLoading: billsLoading } = useBills({ isActive: true });
  const { data: incomeSrcs = [], isLoading: incomeLoading } = useIncomeSources();
  const { data: creditSeries = [], isLoading: creditsLoading } = useCredits({ isActive: true });

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

  const { data: periodPayments = [], isLoading: paymentsLoading } =
    useBillPaymentsForPeriod({ startDate: windowStart, endDate: windowEnd });

  const { data: periodReceipts = [], isLoading: receiptsLoading } =
    useCreditReceiptsForPeriod({ startDate: windowStart, endDate: windowEnd });

  // Prefetch prev and next periods so Prev/Next navigation is instant
  const qc = useQueryClient();
  useEffect(() => {
    for (const dir of [1, -1] as const) {
      const adjStart = shiftPeriodStart(interval, periodStart, dir, paydayInterval);
      const adjStartStr = toDateStr(adjStart);
      const adjEndStr = toDateStr(getPeriodEnd(interval, adjStart, paydayInterval));
      const window = { startDate: adjStartStr, endDate: adjEndStr };

      qc.prefetchQuery({
        queryKey: occurrenceKeys.bills(window),
        queryFn: () => getBillOccurrences({ data: window }),
        staleTime: PERIOD_STALE_MS,
      });
      qc.prefetchQuery({
        queryKey: occurrenceKeys.income(window),
        queryFn: () => getIncomeOccurrences({ data: window }),
        staleTime: PERIOD_STALE_MS,
      });
      qc.prefetchQuery({
        queryKey: occurrenceKeys.credits(window),
        queryFn: () => getCreditOccurrences({ data: window }),
        staleTime: PERIOD_STALE_MS,
      });
      qc.prefetchQuery({
        queryKey: ["bill-payments-period", window] as const,
        queryFn: () => getBillPaymentsForPeriod({ data: window }),
        staleTime: PERIOD_STALE_MS,
      });
      qc.prefetchQuery({
        queryKey: ["credit-receipts-period", window] as const,
        queryFn: () => getCreditReceiptsForPeriod({ data: window }),
        staleTime: PERIOD_STALE_MS,
      });
    }
  }, [windowStart, windowEnd]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const filteredCreditOccs = useMemo(
    () =>
      creditOccs.filter((occ) => isDateInRange(occ.dueDate, windowStart, windowEnd)),
    [creditOccs, windowStart, windowEnd]
  );

  const rows: TrackerRow[] = useMemo(() => {
    const billIdsInWindow = new Set(filteredBillOccs.map((occ) => occ.billId));
    const incomeIdsInWindow = new Set(
      filteredIncomeOccs.map((occ) => occ.incomeSourceId)
    );
    const creditIdsInWindow = new Set(filteredCreditOccs.map((occ) => occ.creditId));

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

    const creditRows: TrackerRow[] = creditSeries
      .filter((c) => creditIdsInWindow.has(c.id))
      .map((c) => ({
        id: `credit:${c.id}`,
        type: "credit" as const,
        name: c.name,
        vendorName: (c as any).vendor?.name ?? null,
        categoryName: (c as any).category?.name ?? null,
        categoryColor: (c as any).category?.color ?? null,
        amountCents: c.amountCents,
        interval: c.interval,
        sortOrder: c.sortOrder,
      }));

    return [...billRows, ...incomeRows, ...creditRows].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [bills, incomeSrcs, creditSeries, filteredBillOccs, filteredIncomeOccs, filteredCreditOccs]);

  // Build O(1) lookup: entityId → occurrenceId → occurrence
  // Keyed by id (not date) so multiple occurrences on the same date are all retained.
  const billOccurrenceMap = useMemo(() => {
    const map = new Map<string, Map<string, BillOccurrence>>();
    for (const occ of filteredBillOccs) {
      let inner = map.get(occ.billId);
      if (!inner) {
        inner = new Map();
        map.set(occ.billId, inner);
      }
      inner.set(occ.id, occ);
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
      inner.set(occ.id, occ);
    }
    return map;
  }, [filteredIncomeOccs]);

  const creditOccurrenceMap = useMemo(() => {
    const map = new Map<string, Map<string, CreditOccurrence>>();
    for (const occ of filteredCreditOccs) {
      let inner = map.get(occ.creditId);
      if (!inner) {
        inner = new Map();
        map.set(occ.creditId, inner);
      }
      inner.set(occ.id, occ);
    }
    return map;
  }, [filteredCreditOccs]);

  // occurrenceId → payments[] (sorted by paidDate asc from server)
  const billPaymentsByOccurrenceMap = useMemo(() => {
    const map = new Map<string, BillPayment[]>();
    for (const p of periodPayments) {
      let arr = map.get(p.occurrenceId);
      if (!arr) {
        arr = [];
        map.set(p.occurrenceId, arr);
      }
      arr.push(p);
    }
    return map;
  }, [periodPayments]);

  // occurrenceId → receipts[] (sorted by receivedDate asc from server)
  const creditReceiptsByOccurrenceMap = useMemo(() => {
    const map = new Map<string, CreditReceipt[]>();
    for (const r of periodReceipts) {
      let arr = map.get(r.occurrenceId);
      if (!arr) {
        arr = [];
        map.set(r.occurrenceId, arr);
      }
      arr.push(r);
    }
    return map;
  }, [periodReceipts]);

  const isLoading =
    billsLoading || incomeLoading || creditsLoading ||
    billOccsLoading || incomeOccsLoading || creditOccsLoading ||
    paymentsLoading || receiptsLoading;

  return {
    rows,
    billOccurrenceMap,
    incomeOccurrenceMap,
    creditOccurrenceMap,
    billPaymentsByOccurrenceMap,
    creditReceiptsByOccurrenceMap,
    windowStart,
    windowEnd,
    isLoading,
  };
}
