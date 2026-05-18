import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useDashboard } from "~/hooks/use-dashboard";
import { SummaryCards } from "~/components/dashboard/summary-cards";
import { UnallocatedBanner } from "~/components/dashboard/unallocated-banner";
import { UpcomingBillsList } from "~/components/dashboard/upcoming-bills-list";
import { OverdueBillsList } from "~/components/dashboard/overdue-bills-list";
import { RecentPaymentsList } from "~/components/dashboard/recent-payments-list";
import { IncomeExpenseChart } from "~/components/dashboard/income-expense-chart";
import { CategoryBreakdownChart } from "~/components/dashboard/category-breakdown-chart";
import { trackerStore } from "~/store/tracker-store";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent } from "~/components/ui/card";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const referenceDate = useStore(trackerStore, (s) => s.periodStart);
  const { data, isLoading, isError } = useDashboard(referenceDate, 30);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-sm text-red-500">
          Failed to load dashboard data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your budget overview at a glance
        </p>
      </div>

      <UnallocatedBanner data={data} />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Overview
        </h2>
        <SummaryCards data={data} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Trends
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <IncomeExpenseChart monthlyTrend={data.monthlyTrend} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <CategoryBreakdownChart categoryBreakdown={data.categoryBreakdown} />
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Activity
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <OverdueBillsList overdueBills={data.overdueBills} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <UpcomingBillsList upcomingBills={data.upcomingBills} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <RecentPaymentsList
                recentPayments={data.recentPayments}
                referenceDate={referenceDate}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
