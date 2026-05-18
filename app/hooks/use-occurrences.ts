import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBillOccurrences,
  carryForwardOccurrence,
  updateBillOccurrence,
} from "~/server/fn/bill-occurrences";
import {
  addBillPayment,
  getBillPayments,
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

export function useBillOccurrences(
  filters: Parameters<typeof getBillOccurrences>[0]["data"]
) {
  return useQuery({
    queryKey: occurrenceKeys.bills(filters),
    queryFn: () => getBillOccurrences({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

export function useIncomeOccurrences(
  filters: Parameters<typeof getIncomeOccurrences>[0]["data"]
) {
  return useQuery({
    queryKey: occurrenceKeys.income(filters),
    queryFn: () => getIncomeOccurrences({ data: filters }),
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

export function useBillPayments(occurrenceId: string | null) {
  return useQuery({
    queryKey: occurrenceKeys.payments(occurrenceId),
    queryFn: () => getBillPayments({ data: { occurrenceId: occurrenceId! } }),
    enabled: !!occurrenceId,
  });
}

export function useAddBillPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addBillPayment>[0]["data"]) =>
      addBillPayment({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
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
    mutationFn: (id: string) => carryForwardOccurrence({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
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

export function useUpdateBillOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBillOccurrence>[0]["data"]) =>
      updateBillOccurrence({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
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
