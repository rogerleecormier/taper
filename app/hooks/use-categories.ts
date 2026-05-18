import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
} from "~/server/fn/categories";

export const categoryKeys = {
  all: () => ["categories"] as const,
};

export function useCategories(type?: "expense" | "income") {
  return useQuery({
    queryKey: [...categoryKeys.all(), type],
    queryFn: () => getCategories({ data: type ? { type } : undefined }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createCategory>[0]["data"]) =>
      createCategory({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all() }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateCategory>[0]["data"]) =>
      updateCategory({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all() }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all() }),
  });
}

export function useSeedDefaultCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => seedDefaultCategories(),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all() }),
  });
}

