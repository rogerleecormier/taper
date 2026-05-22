import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { GoalList } from "~/components/goals/goal-list";
import { GoalFormDialog } from "~/components/goals/goal-form-dialog";
import { GoalTransferDialog } from "~/components/goals/goal-transfer-dialog";
import { useGoals } from "~/hooks/use-goals";

export const Route = createFileRoute("/_app/goals/")({
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals, isLoading, isError } = useGoals();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Save toward specific targets and reallocate funds as needed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GoalTransferDialog
            goals={(goals ?? []).map((g) => ({ id: g.id, name: g.name, allocatedCents: g.allocatedCents }))}
          />
          <GoalFormDialog
            trigger={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            }
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/30 bg-danger/5 py-16 text-center">
          <p className="text-sm text-danger font-medium">Failed to load goals. Please try again.</p>
        </div>
      )}

      {!isLoading && !isError && <GoalList goals={goals ?? []} />}
    </div>
  );
}
