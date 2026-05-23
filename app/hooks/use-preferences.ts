import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserPreferences, updateUserPreferences } from "~/server/fn/user-preferences";

export type UserPreferences = Awaited<ReturnType<typeof getUserPreferences>>;

const PREFS_KEY = ["user-preferences"] as const;

export const DEFAULT_PREFS: UserPreferences = {
  trackerDefaultMode: "board",
  trackerDefaultScope: "month",
  trackerDefaultMonthInterval: "week",
  trackerDefaultYearInterval: "month",
  paydayInterval: "biweekly",
  paydayAnchorDate: null,
  dashboardPeriodMode: "month",
};

export function usePreferences() {
  return useQuery({
    queryKey: PREFS_KEY,
    queryFn: () => getUserPreferences(),
    staleTime: 0,
    placeholderData: DEFAULT_PREFS,
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateUserPreferences>[0]["data"]) =>
      updateUserPreferences({ data }),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: PREFS_KEY });
      const prev = qc.getQueryData<UserPreferences>(PREFS_KEY);
      qc.setQueryData<UserPreferences>(PREFS_KEY, (old) =>
        old ? { ...old, ...data } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(PREFS_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: PREFS_KEY });
    },
  });
}
