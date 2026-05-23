import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "~/server/fn/dashboard";

export function useDashboard(periodStart: string, periodEnd: string, upcomingDays: 7 | 14 | 30 = 7) {
  return useQuery({
    queryKey: ["dashboard", periodStart, periodEnd, upcomingDays],
    queryFn: () =>
      getDashboardData({ data: { upcomingDays, periodStart, periodEnd } }),
    staleTime: 60_000,
  });
}
