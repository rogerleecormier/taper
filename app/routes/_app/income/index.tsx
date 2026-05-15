import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useIncomeSources } from "~/hooks/use-income";
import { IncomeList } from "~/components/income/income-list";
import { IncomeFormDialog } from "~/components/income/income-form-dialog";

export const Route = createFileRoute("/_app/income/")({
  component: IncomePage,
});

function IncomePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: incomeSources, isLoading, isError } = useIncomeSources();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your income sources and schedules
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Income
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}

      {isError && (
        <p className="text-sm text-red-500">
          Failed to load income sources. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <IncomeList incomeSources={incomeSources ?? []} />
      )}

      <IncomeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
