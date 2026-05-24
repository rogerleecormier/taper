import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBillOccurrences,
  carryForwardOccurrence,
  reverseCarryForward,
  reverseCarryForwardBySource,
  reopenOccurrence,
  updateBillOccurrence,
  deleteOccurrence,
} from "~/server/fn/bill-occurrences";
import {
  addBillPayment,
  getBillPayments,
  getBillPaymentsForPeriod,
  deleteBillPayment,
  updateBillPayment,
  getScheduledPaymentsForPage,
  getPaidPaymentsForPage,
  getCarriedForwardUnpaid,
} from "~/server/fn/bill-payments";
import {
  getIncomeOccurrences,
  markIncomeReceived,
  markIncomeSkipped,
  updateIncomeOccurrence,
} from "~/server/fn/income-occurrences";
import {
  getCreditOccurrences,
  carryForwardCreditOccurrence,
  reverseCreditCarryForward,
  updateCreditOccurrence,
  deleteCreditOccurrence,
} from "~/server/fn/credit-occurrences";
import {
  addCreditReceipt,
  getCreditReceipts,
  getCreditReceiptsForPeriod,
  deleteCreditReceipt,
} from "~/server/fn/credit-receipts";

export const occurrenceKeys = {
  bills: (filters: object) => ["bill-occurrences", filters] as const,
  income: (filters: object) => ["income-occurrences", filters] as const,
  credits: (filters: object) => ["credit-occurrences", filters] as const,
  payments: (occurrenceId: string | null) =>
    ["bill-payments", occurrenceId] as const,
  receipts: (occurrenceId: string | null) =>
    ["credit-receipts", occurrenceId] as const,
};

const PERIOD_STALE_MS = 5 * 60 * 1000; // matches server KV cache TTL

export function useBillOccurrences(
  filters: Parameters<typeof getBillOccurrences>[0]["data"]
) {
  return useQuery({
    queryKey: occurrenceKeys.bills(filters),
    queryFn: () => getBillOccurrences({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: PERIOD_STALE_MS,
  });
}

export function useIncomeOccurrences(
  filters: Parameters<typeof getIncomeOccurrences>[0]["data"]
) {
  return useQuery({
    queryKey: occurrenceKeys.income(filters),
    queryFn: () => getIncomeOccurrences({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: PERIOD_STALE_MS,
  });
}

export function useBillPayments(occurrenceId: string | null) {
  return useQuery({
    queryKey: occurrenceKeys.payments(occurrenceId),
    queryFn: () => getBillPayments({ data: { occurrenceId: occurrenceId! } }),
    enabled: !!occurrenceId,
  });
}

export function useBillPaymentsForPeriod(
  filters: Parameters<typeof getBillPaymentsForPeriod>[0]["data"]
) {
  return useQuery({
    queryKey: ["bill-payments-period", filters] as const,
    queryFn: () => getBillPaymentsForPeriod({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: PERIOD_STALE_MS,
  });
}

export function useScheduledPaymentsForPage(
  filters: Parameters<typeof getScheduledPaymentsForPage>[0]["data"]
) {
  return useQuery({
    queryKey: ["payments-page-scheduled", filters] as const,
    queryFn: () => getScheduledPaymentsForPage({ data: filters }),
    staleTime: PERIOD_STALE_MS,
  });
}

export function useCarriedForwardUnpaid() {
  return useQuery({
    queryKey: ["carried-forward-unpaid"] as const,
    queryFn: () => getCarriedForwardUnpaid({}),
    staleTime: PERIOD_STALE_MS,
  });
}

export function usePaidPaymentsForPage(
  filters: Parameters<typeof getPaidPaymentsForPage>[0]["data"]
) {
  return useQuery({
    queryKey: ["payments-page-paid", filters] as const,
    queryFn: () => getPaidPaymentsForPage({ data: filters }),
    staleTime: PERIOD_STALE_MS,
  });
}

export function useAddBillPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addBillPayment>[0]["data"]) =>
      addBillPayment({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({
        queryKey: occurrenceKeys.payments(variables.occurrenceId),
      });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteBillPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      occurrenceId: _occurrenceId,
    }: {
      id: string;
      occurrenceId: string;
    }) => deleteBillPayment({ data: { id } }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["payments-page-paid"] });
      qc.invalidateQueries({ queryKey: ["payments-page-scheduled"] });
      qc.invalidateQueries({
        queryKey: occurrenceKeys.payments(variables.occurrenceId),
      });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBillPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBillPayment>[0]["data"]) =>
      updateBillPayment({ data }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payments-page-scheduled"] });
      qc.invalidateQueries({ queryKey: ["payments-page-paid"] });
      if (result?.occurrenceId) {
        qc.invalidateQueries({ queryKey: occurrenceKeys.payments(result.occurrenceId) });
      }
    },
  });
}

export function useCarryForwardOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; targetDate: string }) =>
      carryForwardOccurrence({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["carried-forward-unpaid"] });
      qc.invalidateQueries({ queryKey: ["payments-page-scheduled"] });
    },
  });
}

export function useReverseCarryForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reverseCarryForward({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["carried-forward-unpaid"] });
      qc.invalidateQueries({ queryKey: ["payments-page-scheduled"] });
    },
  });
}

export function useReverseCarryForwardBySource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => reverseCarryForwardBySource({ data: { sourceId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["carried-forward-unpaid"] });
      qc.invalidateQueries({ queryKey: ["payments-page-scheduled"] });
    },
  });
}

export function useMarkIncomeReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof markIncomeReceived>[0]["data"]) =>
      markIncomeReceived({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarkIncomeSkipped() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markIncomeSkipped({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
    },
  });
}

export function useReopenOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reopenOccurrence({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBillOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBillOccurrence>[0]["data"]) =>
      updateBillOccurrence({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["carried-forward-unpaid"] });
    },
  });
}

export function useDeleteOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOccurrence({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["bill-payments-period"] });
      qc.invalidateQueries({ queryKey: ["bill-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateIncomeOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateIncomeOccurrence>[0]["data"]) =>
      updateIncomeOccurrence({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Credit occurrence hooks ──────────────────────────────────────────────────

export function useCreditOccurrences(
  filters: Parameters<typeof getCreditOccurrences>[0]["data"]
) {
  return useQuery({
    queryKey: occurrenceKeys.credits(filters),
    queryFn: () => getCreditOccurrences({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: PERIOD_STALE_MS,
  });
}

export function useCreditReceipts(occurrenceId: string | null) {
  return useQuery({
    queryKey: occurrenceKeys.receipts(occurrenceId),
    queryFn: () => getCreditReceipts({ data: { occurrenceId: occurrenceId! } }),
    enabled: !!occurrenceId,
  });
}

export function useCreditReceiptsForPeriod(
  filters: Parameters<typeof getCreditReceiptsForPeriod>[0]["data"]
) {
  return useQuery({
    queryKey: ["credit-receipts-period", filters] as const,
    queryFn: () => getCreditReceiptsForPeriod({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: PERIOD_STALE_MS,
  });
}

export function useAddCreditReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addCreditReceipt>[0]["data"]) =>
      addCreditReceipt({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["credit-receipts-period"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
      qc.invalidateQueries({
        queryKey: occurrenceKeys.receipts(variables.occurrenceId),
      });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCreditReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      occurrenceId: _occurrenceId,
    }: {
      id: string;
      occurrenceId: string;
    }) => deleteCreditReceipt({ data: { id } }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["credit-receipts-period"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
      qc.invalidateQueries({
        queryKey: occurrenceKeys.receipts(variables.occurrenceId),
      });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCarryForwardCreditOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; targetDate: string }) =>
      carryForwardCreditOccurrence({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["credit-receipts-period"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReverseCreditCarryForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reverseCreditCarryForward({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["credit-receipts-period"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCreditOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateCreditOccurrence>[0]["data"]) =>
      updateCreditOccurrence({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCreditOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCreditOccurrence({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["credit-receipts-period"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
