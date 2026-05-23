import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  reorderGoals,
  transferGoalFunds,
  getGoalTransferHistory,
} from "~/server/fn/goals";

export const goalKeys = {
  all: () => ["goals"] as const,
  filtered: (filters: object) => ["goals", filters] as const,
  detail: (id: string) => ["goal", id] as const,
  transferHistory: (filters: object) => ["goal-transfers", filters] as const,
};

type GoalsFilters = {
  includeArchived?: boolean;
};

type GoalTransferHistoryFilters = {
  goalId?: string;
  startDate?: string;
  endDate?: string;
};

export function useGoals(filters?: GoalsFilters) {
  return useQuery({
    queryKey: goalKeys.filtered(filters ?? {}),
    queryFn: () => getGoals({ data: filters }),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: () => getGoal({ data: { id } }),
    enabled: !!id,
  });
}

export function useGoalTransferHistory(
  filters?: GoalTransferHistoryFilters
) {
  return useQuery({
    queryKey: goalKeys.transferHistory(filters ?? {}),
    queryFn: () => getGoalTransferHistory({ data: filters }),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createGoal>[0]["data"]) => createGoal({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateGoal>[0]["data"]) => updateGoal({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoal({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReorderGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderGoals({ data: { orderedIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all() }),
  });
}

export function useTransferGoalFunds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof transferGoalFunds>[0]["data"]) =>
      transferGoalFunds({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all() });
      qc.invalidateQueries({ queryKey: ["goal-transfers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
