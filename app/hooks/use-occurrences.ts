import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBillOccurrences,
  markOccurrencePaid,
  markOccurrenceSkipped,
} from "~/server/fn/bill-occurrences";
import {
  getIncomeOccurrences,
  markIncomeReceived,
  markIncomeSkipped,
} from "~/server/fn/income-occurrences";

export const occurrenceKeys = {
  bills: (filters: object) => ["bill-occurrences", filters] as const,
  income: (filters: object) => ["income-occurrences", filters] as const,
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

export function useMarkOccurrencePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof markOccurrencePaid>[0]["data"]) =>
      markOccurrencePaid({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarkOccurrenceSkipped() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markOccurrenceSkipped({ data: { id } }),
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
