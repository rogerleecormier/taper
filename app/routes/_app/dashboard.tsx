import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { addDays, parseISO } from "date-fns";
import { useDashboard } from "~/hooks/use-dashboard";
import { usePreferences } from "~/hooks/use-preferences";
import { SummaryCards } from "~/components/dashboard/summary-cards";
import { UnallocatedBanner } from "~/components/dashboard/unallocated-banner";
import { UpcomingBillsList } from "~/components/dashboard/upcoming-bills-list";
import { OverdueBillsList } from "~/components/dashboard/overdue-bills-list";
import { RecentPaymentsList } from "~/components/dashboard/recent-payments-list";
import { CarriedForwardList } from "~/components/dashboard/carried-forward-list";
import { IncomeExpenseChart } from "~/components/dashboard/income-expense-chart";
import { CategoryBreakdownChart } from "~/components/dashboard/category-breakdown-chart";
import { GoalsList } from "~/components/dashboard/goals-list";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent } from "~/components/ui/card";
import { getMostRecentPayday, getPeriodEnd, toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Taper",
      },
      {
        name: "description",
        content: "Your budget overview at a glance",
      },
    ],
  }),
});

function computePayPeriod(
  viewingNext: number,
  paydayAnchorDate: string | null,
  paydayInterval: "weekly" | "biweekly"
): { periodStart: string; periodEnd: string } {
  const today = new Date();
  let periodStart: string;

  if (!paydayAnchorDate) {
    periodStart = toDateStr(today);
  } else {
    periodStart = getMostRecentPayday(paydayAnchorDate, paydayInterval, today);
  }

  const periodStartDate = parseISO(periodStart);
  const offset = viewingNext * (paydayInterval === "weekly" ? 7 : 14);
  const adjustedStart = addDays(periodStartDate, offset);
  const adjustedStartStr = toDateStr(adjustedStart);
  const periodEndDate = getPeriodEnd("pay-period", adjustedStart, paydayInterval);
  const periodEndStr = toDateStr(periodEndDate);

  return {
    periodStart: adjustedStartStr,
    periodEnd: periodEndStr,
  };
}

function DashboardPage() {
  const [viewingNextCount, setViewingNextCount] = useState(0);
  const prefsQuery = usePreferences();
  const prefs = prefsQuery.data;

  const { periodStart, periodEnd } = computePayPeriod(
    viewingNextCount,
    prefs?.paydayAnchorDate ?? null,
    prefs?.paydayInterval ?? "biweekly"
  );

  const { data, isLoading, isError } = useDashboard(periodStart, periodEnd, 30);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-sm text-destructive font-medium">
          Failed to load dashboard data. Please try again.
        </p>
      </div>
    );
  }

  const psDate = parseISO(periodStart);
  const peDate = parseISO(periodEnd);
  const dateRangeLabel = psDate.getMonth() === peDate.getMonth() && psDate.getFullYear() === peDate.getFullYear()
    ? `${format(psDate, "MMM d")} – ${format(peDate, "d, yyyy")}`
    : `${format(psDate, "MMM d")} – ${format(peDate, "MMM d, yyyy")}`;

  return (
    <div className="entity-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateRangeLabel}
          </p>
        </div>

        <div className="flex-shrink-0 mt-1 flex items-center gap-3">
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setViewingNextCount(0)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                viewingNextCount === 0
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              This Period
            </button>
            <button
              type="button"
              onClick={() => setViewingNextCount(1)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                viewingNextCount === 1
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Next Period
            </button>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setViewingNextCount(Math.max(0, viewingNextCount - 1))}
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Previous period"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setViewingNextCount(viewingNextCount + 1)}
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Next period"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <UnallocatedBanner data={data} />

      <Separator className="bg-border" />

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Overview
        </h2>
        <SummaryCards data={data} />
      </section>

      <Separator className="bg-border" />

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Trends
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-6">
              <IncomeExpenseChart data={data} />
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-6">
              <CategoryBreakdownChart categoryBreakdown={data.categoryBreakdown} />
            </CardContent>
          </Card>
        </div>
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-6">
            <GoalsList goals={data.goals} />
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border" />

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Activity
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-6">
              <OverdueBillsList overdueBills={data.overdueBills} />
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-6">
              <UpcomingBillsList upcomingBills={data.upcomingBills} />
            </CardContent>
          </Card>
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-6">
              <RecentPaymentsList
                recentPayments={data.recentPayments}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="bg-border" />

      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Carried Balances
          </h2>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Expenses that were carried forward and are still unpaid — click any row to pay or take action.
          </p>
        </div>
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-0">
            <CarriedForwardList />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
