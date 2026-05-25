import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { useIncomeSources } from "~/hooks/use-income";
import { IncomeList } from "~/components/income/income-list";
import { IncomeFormDialog } from "~/components/income/income-form-dialog";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/income/")({
  component: IncomePage,
  head: () => ({
    meta: [
      {
        title: "Income Sources - Taper",
      },
      {
        name: "description",
        content: "Manage your income sources and pay schedules",
      },
    ],
  }),
});

function IncomePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: incomeSources, isLoading, isError } = useIncomeSources();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Income Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your income sources and pay schedules
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Income
        </Button>
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
          <p className="text-sm text-danger font-medium">Failed to load income sources.</p>
          <p className="text-xs text-muted-foreground mt-1">
            If this is a new setup, run:{" "}
            <code className="font-mono">npx wrangler d1 migrations apply budget-db --remote</code>
          </p>
        </div>
      )}

      {!isLoading && !isError && incomeSources?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1 font-heading text-foreground">No income sources yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Add a salary, freelance contract, or payroll source to start tracking your earnings and pay schedule.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add your first income source
          </Button>
        </div>
      )}

      {!isLoading && !isError && incomeSources && incomeSources.length > 0 && (
        <IncomeList incomeSources={incomeSources} />
      )}

      <IncomeFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
