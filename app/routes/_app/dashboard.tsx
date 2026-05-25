import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { startOfMonth, endOfMonth, addMonths, addDays, parseISO } from "date-fns";
import { useDashboard } from "~/hooks/use-dashboard";
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
import { getMostRecentPayday, toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";

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

function computePeriod(viewingNext: boolean): { periodStart: string; periodEnd: string } {
  const today = new Date();
  const base = viewingNext ? addMonths(today, 1) : today;
  return {
    periodStart: toDateStr(startOfMonth(base)),
    periodEnd: toDateStr(endOfMonth(base)),
  };
}

function DashboardPage() {
  const [viewingNext, setViewingNext] = useState(false);

  const { periodStart, periodEnd } = computePeriod(viewingNext);

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

  return (
    <div className="entity-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your budget overview at a glance
          </p>
        </div>

        <div className="flex-shrink-0 mt-1">
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setViewingNext(false)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                !viewingNext
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setViewingNext(true)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                viewingNext
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Next Month
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
