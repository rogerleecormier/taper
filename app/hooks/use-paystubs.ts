import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaystubsForSource,
  getIncomeSourceDetail,
  uploadAndAnalyzePaystub,
  deletePaystub,
} from "~/server/fn/paystubs";

export const paystubKeys = {
  detail: (id: string) => ["income-source-detail", id] as const,
  stubs: (sourceId: string) => ["paystubs", sourceId] as const,
};

export function useIncomeSourceDetail(id: string) {
  return useQuery({
    queryKey: paystubKeys.detail(id),
    queryFn: () => getIncomeSourceDetail({ data: { id } }),
    enabled: !!id,
  });
}

export function usePaystubsForSource(incomeSourceId: string) {
  return useQuery({
    queryKey: paystubKeys.stubs(incomeSourceId),
    queryFn: () => getPaystubsForSource({ data: { incomeSourceId } }),
    enabled: !!incomeSourceId,
  });
}

export function useUploadAndAnalyzePaystub(incomeSourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof uploadAndAnalyzePaystub>[0]["data"]) =>
      uploadAndAnalyzePaystub({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paystubKeys.detail(incomeSourceId) });
      qc.invalidateQueries({ queryKey: paystubKeys.stubs(incomeSourceId) });
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeletePaystub(incomeSourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paystubId: string) => deletePaystub({ data: { paystubId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paystubKeys.detail(incomeSourceId) });
      qc.invalidateQueries({ queryKey: paystubKeys.stubs(incomeSourceId) });
      qc.invalidateQueries({ queryKey: ["income-occurrences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
