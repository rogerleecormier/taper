import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBills,
  getBill,
  getBillHistory,
  createBill,
  updateBill,
  deleteBill,
  reorderBills,
} from "~/server/fn/bills";

export const billKeys = {
  all: () => ["bills"] as const,
  filtered: (filters: object) => ["bills", filters] as const,
  detail: (id: string) => ["bills", id] as const,
  history: (id: string) => ["bill-history", id] as const,
};

export function useBills(filters?: Parameters<typeof getBills>[0]["data"]) {
  return useQuery({
    queryKey: billKeys.filtered(filters ?? {}),
    queryFn: () => getBills({ data: filters }),
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: billKeys.detail(id),
    queryFn: () => getBill({ data: { id } }),
    enabled: !!id,
  });
}

export function useBillHistory(id: string) {
  return useQuery({
    queryKey: billKeys.history(id),
    queryFn: () => getBillHistory({ data: { id } }),
    enabled: !!id,
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createBill>[0]["data"]) =>
      createBill({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billKeys.all() });
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateBill>[0]["data"]) =>
      updateBill({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billKeys.all() });
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBill({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billKeys.all() });
      qc.invalidateQueries({ queryKey: ["bill-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReorderBills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderBills({ data: { orderedIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: billKeys.all() }),
  });
}
