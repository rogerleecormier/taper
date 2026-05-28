import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCredits,
  getCredit,
  getCreditHistory,
  createCredit,
  updateCredit,
  deleteCredit,
  reorderCredits,
  toggleCreditHidden,
} from "~/server/fn/credits";

export const creditKeys = {
  all: () => ["credits"] as const,
  filtered: (filters: object) => ["credits", filters] as const,
  detail: (id: string) => ["credits", id] as const,
  history: (id: string) => ["credit-history", id] as const,
};

type CreditsFilters = {
  categoryId?: string;
  vendorId?: string;
  isActive?: boolean;
};

export function useCredits(filters?: CreditsFilters) {
  return useQuery({
    queryKey: creditKeys.filtered(filters ?? {}),
    queryFn: () => getCredits({ data: filters }),
  });
}

export function useCredit(id: string) {
  return useQuery({
    queryKey: creditKeys.detail(id),
    queryFn: () => getCredit({ data: { id } }),
    enabled: !!id,
  });
}

export function useCreditHistory(id: string) {
  return useQuery({
    queryKey: creditKeys.history(id),
    queryFn: () => getCreditHistory({ data: { id } }),
    enabled: !!id,
  });
}

export function useCreateCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createCredit>[0]["data"]) =>
      createCredit({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: creditKeys.all() });
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateCredit>[0]["data"]) =>
      updateCredit({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: creditKeys.all() });
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCredit({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: creditKeys.all() });
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useToggleCreditHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; hidden: boolean }) =>
      toggleCreditHidden({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: creditKeys.all() });
      qc.invalidateQueries({ queryKey: ["credit-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReorderCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderCredits({ data: { orderedIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: creditKeys.all() }),
  });
}
