import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
} from "~/server/fn/vendors";

export const vendorKeys = {
  all: () => ["vendors"] as const,
  detail: (id: string) => ["vendors", id] as const,
};

export function useVendors() {
  return useQuery({
    queryKey: vendorKeys.all(),
    queryFn: () => getVendors(),
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => getVendor({ data: { id } }),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createVendor>[0]["data"]) =>
      createVendor({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: vendorKeys.all() }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateVendor>[0]["data"]) =>
      updateVendor({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: vendorKeys.all() }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVendor({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: vendorKeys.all() }),
  });
}
