import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { useBills } from "~/hooks/use-bills";
import { BillList } from "~/components/bills/bill-list";
import { BillFormDialog } from "~/components/bills/bill-form-dialog";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/bills/")({
  component: BillsPage,
});

function BillsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showStandaloneExpenses, setShowStandaloneExpenses] = useState(false);
  const { data: bills, isLoading, isError } = useBills();
  const visibleBills = (bills ?? []).filter((bill) =>
    showStandaloneExpenses ? true : bill.interval !== "standalone"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your recurring and one-time expenses
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>
      <label className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showStandaloneExpenses}
          onChange={(e) => setShowStandaloneExpenses(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Show standalone expenses
      </label>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-destructive">Failed to load expenses.</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh the page and try again.</p>
        </div>
      )}

      {!isLoading && !isError && bills?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1">No expenses yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Add your recurring bills, subscriptions, and one-time expenses to start tracking what you owe.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add your first expense
          </Button>
        </div>
      )}

      {!isLoading && !isError && bills && bills.length > 0 && visibleBills.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No recurring expenses in this view.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Turn on &quot;Show standalone expenses&quot; to include one-time items.
          </p>
        </div>
      )}

      {!isLoading && !isError && visibleBills.length > 0 && (
        <BillList bills={visibleBills} />
      )}

      <BillFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
