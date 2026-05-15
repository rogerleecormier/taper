import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  reorderIncomeSources,
} from "~/server/fn/income-sources";

export const incomeKeys = {
  all: () => ["income-sources"] as const,
};

export function useIncomeSources() {
  return useQuery({
    queryKey: incomeKeys.all(),
    queryFn: () => getIncomeSources(),
  });
}

export function useCreateIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createIncomeSource>[0]["data"]) =>
      createIncomeSource({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incomeKeys.all() });
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateIncomeSource>[0]["data"]) =>
      updateIncomeSource({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incomeKeys.all() });
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncomeSource({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incomeKeys.all() });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReorderIncomeSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderIncomeSources({ data: { orderedIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: incomeKeys.all() }),
  });
}
