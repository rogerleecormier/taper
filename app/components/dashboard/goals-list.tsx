import { useState } from "react";
import { Target } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import type { DashboardData } from "~/server/fn/dashboard";

interface GoalsListProps {
  goals: DashboardData["goals"];
}

const GOALS_PAGE_SIZE = 3;

export function GoalsList({ goals }: GoalsListProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(goals.length / GOALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * GOALS_PAGE_SIZE;
  const paginatedGoals = goals.slice(start, start + GOALS_PAGE_SIZE);

  if (goals.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold">Goals</h3>
        <p className="mt-2 text-sm text-muted-foreground">No goals yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Goals</h3>
      <div className="mt-3 space-y-3">
        {paginatedGoals.map((goal) => {
          const width = Math.max(0, Math.min(100, goal.progressPercent));
          const isReached = goal.progressPercent >= 100;
          return (
            <div key={goal.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">{goal.name}</span>
                  {isReached && (
                    <span className="goal-reached-badge rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                      Reached
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{goal.progressPercent}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(goal.allocatedCents)} saved</span>
                <span>Target {formatCurrency(goal.targetAmountCents)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              safePage === 1
                ? "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground/60"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              safePage === totalPages
                ? "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground/60"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
