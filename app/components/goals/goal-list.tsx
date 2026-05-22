"use client";

import { Pencil, Plus, Trash2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { formatCurrency } from "~/lib/currency";
import { GoalFormDialog } from "./goal-form-dialog";
import { useDeleteGoal } from "~/hooks/use-goals";
import type { Goal } from "~/db/schema/goals";

interface GoalListProps {
  goals: Goal[];
}

export function GoalList({ goals }: GoalListProps) {
  const deleteGoal = useDeleteGoal();
  const [burstingGoalIds, setBurstingGoalIds] = useState<Record<string, boolean>>({});

  const reachedGoals = useMemo(
    () => goals.filter((g) => g.allocatedCents >= g.targetAmountCents && g.targetAmountCents > 0),
    [goals]
  );

  useEffect(() => {
    const newlyReached: string[] = [];
    for (const goal of reachedGoals) {
      const key = `goal-celebrated:${goal.id}`;
      if (sessionStorage.getItem(key) === "1") continue;
      sessionStorage.setItem(key, "1");
      newlyReached.push(goal.id);
    }
    if (newlyReached.length === 0) return;

    setBurstingGoalIds((prev) => {
      const next = { ...prev };
      for (const id of newlyReached) next[id] = true;
      return next;
    });

    const timer = setTimeout(() => {
      setBurstingGoalIds((prev) => {
        const next = { ...prev };
        for (const id of newlyReached) delete next[id];
        return next;
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [reachedGoals]);

  async function handleDelete(goal: Goal) {
    if (goal.allocatedCents > 0) {
      alert("Reallocate funds out of this goal before deleting it.");
      return;
    }
    if (!confirm(`Delete goal \"${goal.name}\"?`)) return;
    await deleteGoal.mutateAsync(goal.id);
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">No goals yet.</p>
        <GoalFormDialog
          trigger={
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first goal
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {goals.map((goal) => {
        const remaining = goal.targetAmountCents - goal.allocatedCents;
        const progressPercent = goal.targetAmountCents > 0
          ? Math.round((goal.allocatedCents / goal.targetAmountCents) * 100)
          : 0;
        const width = Math.max(0, Math.min(100, progressPercent));
        const isReached = progressPercent >= 100;
        const isBursting = !!burstingGoalIds[goal.id];

        return (
          <div key={goal.id} className="relative rounded-lg border bg-card p-4">
            {isBursting && (
              <div className="goal-burst" aria-hidden="true">
                <span className="goal-burst-piece" style={{ ["--burst-left" as string]: "18%", ["--burst-delay" as string]: "0ms", ["--burst-rot" as string]: "-14deg" }}>✨</span>
                <span className="goal-burst-piece" style={{ ["--burst-left" as string]: "34%", ["--burst-delay" as string]: "60ms", ["--burst-rot" as string]: "-8deg" }}>🎉</span>
                <span className="goal-burst-piece" style={{ ["--burst-left" as string]: "50%", ["--burst-delay" as string]: "120ms", ["--burst-rot" as string]: "10deg" }}>🏆</span>
                <span className="goal-burst-piece" style={{ ["--burst-left" as string]: "66%", ["--burst-delay" as string]: "40ms", ["--burst-rot" as string]: "16deg" }}>🎊</span>
                <span className="goal-burst-piece" style={{ ["--burst-left" as string]: "82%", ["--burst-delay" as string]: "100ms", ["--burst-rot" as string]: "8deg" }}>✨</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{goal.name}</h3>
                  {isReached && (
                    <span className="goal-reached-badge rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                      Goal reached
                    </span>
                  )}
                </div>
                {goal.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">{goal.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <GoalFormDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  }
                  goalId={goal.id}
                  defaultValues={{
                    name: goal.name,
                    notes: goal.notes ?? "",
                    targetAmountCents: goal.targetAmountCents,
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => handleDelete(goal)}
                  disabled={deleteGoal.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <div>Saved</div>
                <div className="font-semibold text-foreground">{formatCurrency(goal.allocatedCents)}</div>
              </div>
              <div>
                <div>Target</div>
                <div className="font-semibold text-foreground">{formatCurrency(goal.targetAmountCents)}</div>
              </div>
              <div>
                <div>Remaining</div>
                <div className="font-semibold text-foreground">{formatCurrency(remaining)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
