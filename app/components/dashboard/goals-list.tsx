import { Target } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import type { DashboardData } from "~/server/fn/dashboard";

interface GoalsListProps {
  goals: DashboardData["goals"];
}

export function GoalsList({ goals }: GoalsListProps) {
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
        {goals.map((goal) => {
          const width = Math.max(0, Math.min(100, goal.progressPercent));
          return (
            <div key={goal.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">{goal.name}</span>
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
    </div>
  );
}
