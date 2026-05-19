import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBillOccurrences,
  carryForwardOccurrence,
  reverseCarryForward,
  reopenOccurrence,
  updateBillOccurrence,
  deleteOccurrence,
} from "~/server/fn/bill-occurrences";
import {
  addBillPayment,
  getBillPayments,
  getBillPaymentsForPeriod,
  deleteBillPayment,
} from "~/server/fn/bill-payments";
import {
  getIncomeOccurrences,
  markIncomeReceived,
  markIncomeSkipped,
  updateIncomeOccurrence,
} from "~/server/fn/income-occurrences";

export const occurrenceKeys = {
  bills: (filters: object) => ["bill-occurrences", filters] as const,
  income: (filters: object) => ["income-occurrences", filters] as const,
  payments: (occurrenceId: string | null) =>
    ["bill-payments", occurrenceId] as const,
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
      qc.invalidateQueries({
        queryKey: occurrenceKeys.payments(variables.occurrenceId),
      });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
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
