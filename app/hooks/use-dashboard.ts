import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "~/server/fn/dashboard";

export function useDashboard(upcomingDays: 7 | 14 | 30 = 7) {
  return useQuery({
    queryKey: ["dashboard", upcomingDays],
    queryFn: () => getDashboardData({ data: { upcomingDays } }),
    staleTime: 60_000,
  });
}
