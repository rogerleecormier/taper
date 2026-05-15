import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useBills } from "~/hooks/use-bills";
import { BillList } from "~/components/bills/bill-list";
import { BillFormDialog } from "~/components/bills/bill-form-dialog";

export const Route = createFileRoute("/_app/bills/")({
  component: BillsPage,
});

function BillsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: bills, isLoading, isError } = useBills();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your recurring and one-time bills
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Bill
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}

      {isError && (
        <p className="text-sm text-red-500">
          Failed to load bills. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <BillList bills={bills ?? []} />
      )}

      <BillFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
