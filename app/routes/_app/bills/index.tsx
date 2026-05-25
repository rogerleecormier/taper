import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { Plus, Receipt } from "lucide-react";
import { useBills } from "~/hooks/use-bills";
import { BillList } from "~/components/bills/bill-list";
import { BillFormDialog } from "~/components/bills/bill-form-dialog";
import { Button } from "~/components/ui/button";
import { trackerStore, setShowHidden } from "~/store/tracker-store";

export const Route = createFileRoute("/_app/bills/")({
  component: BillsPage,
  head: () => ({
    meta: [
      {
        title: "Expenses - Taper",
      },
      {
        name: "description",
        content: "Manage your recurring and one-time expenses",
      },
    ],
  }),
});

function BillsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showStandaloneExpenses, setShowStandaloneExpenses] = useState(false);
  const showHidden = useStore(trackerStore, (state) => state.showHidden);
  const { data: bills, isLoading, isError } = useBills();
  const visibleBills = (bills ?? []).filter((bill) => {
    if (!showHidden && bill.hidden) return false;
    return showStandaloneExpenses ? true : bill.interval !== "standalone";
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your recurring and one-time expenses
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <label className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showStandaloneExpenses}
            onChange={(e) => setShowStandaloneExpenses(e.target.checked)}
            className="h-4 w-4 rounded border-input bg-card text-primary focus:ring-primary focus:ring-offset-background"
          />
          Show standalone expenses
        </label>
        <label className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="h-4 w-4 rounded border-input bg-card text-primary focus:ring-primary focus:ring-offset-background"
          />
          Show hidden
        </label>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/30 bg-danger/5 py-16 text-center">
          <p className="text-sm text-danger font-medium">Failed to load expenses.</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh the page and try again.</p>
        </div>
      )}

      {!isLoading && !isError && bills?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1 font-heading text-foreground">No expenses yet</h3>
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No recurring expenses in this view.</p>
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
