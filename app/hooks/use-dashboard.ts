import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "~/server/fn/dashboard";
import { toDateStr } from "~/lib/dates";

export function useDashboard(referenceDate: Date, upcomingDays: 7 | 14 | 30 = 7) {
  const referenceDateStr = toDateStr(referenceDate);

  return useQuery({
    queryKey: ["dashboard", referenceDateStr, upcomingDays],
    queryFn: () =>
      getDashboardData({ data: { upcomingDays, referenceDate: referenceDateStr } }),
    staleTime: 60_000,
  });
}
