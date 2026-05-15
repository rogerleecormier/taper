import { createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "~/hooks/use-dashboard";
import { SummaryCards } from "~/components/dashboard/summary-cards";
import { UnallocatedBanner } from "~/components/dashboard/unallocated-banner";
import { UpcomingBillsList } from "~/components/dashboard/upcoming-bills-list";
import { OverdueBillsList } from "~/components/dashboard/overdue-bills-list";
import { RecentPaymentsList } from "~/components/dashboard/recent-payments-list";
import { IncomeExpenseChart } from "~/components/dashboard/income-expense-chart";
import { CategoryBreakdownChart } from "~/components/dashboard/category-breakdown-chart";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, isError } = useDashboard(7);

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

      <SummaryCards data={data} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IncomeExpenseChart data={data} />
        <CategoryBreakdownChart data={data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OverdueBillsList data={data} />
        <UpcomingBillsList data={data} />
        <RecentPaymentsList data={data} />
      </div>
    </div>
  );
}
