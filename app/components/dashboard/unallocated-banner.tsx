import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import type { DashboardData } from "~/server/fn/dashboard";

interface UnallocatedBannerProps {
  data: DashboardData;
}

export function UnallocatedBanner({ data }: UnallocatedBannerProps) {
  const { unallocatedCents, totalMonthlyExpensesCents, totalMonthlyIncomeCents, totalGoalAllocatedCents } = data;

  const isZero = unallocatedCents === 0;
  const isPositive = unallocatedCents > 0;

  const allocatedPercent =
    totalMonthlyIncomeCents > 0
      ? Math.min(
          100,
          Math.round(((totalMonthlyExpensesCents + totalGoalAllocatedCents) / totalMonthlyIncomeCents) * 100)
        )
      : 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 glass-card",
        isZero
          ? "border-success/20 bg-success/5"
          : isPositive
            ? "border-warning/20 bg-warning/5"
            : "border-destructive/20 bg-destructive/5"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          {isZero ? (
            <p className="font-semibold text-success">
              Perfectly Balanced! Fully funneled to a point. 🎯
            </p>
          ) : isPositive ? (
            <p className="font-semibold text-warning">
              {formatCurrency(unallocatedCents)} remaining to taper
            </p>
          ) : (
            <p className="font-semibold text-destructive">
              Over-allocated by {formatCurrency(Math.abs(unallocatedCents))}
            </p>
          )}
          <p
            className={cn(
              "mt-0.5 text-sm",
              isZero
                ? "text-success/90"
                : isPositive
                  ? "text-warning/90"
                  : "text-destructive/90"
            )}
          >
            {allocatedPercent}% of income allocated
          </p>
        </div>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            isZero
              ? "text-success/90"
              : isPositive
                ? "text-warning/90"
                : "text-destructive/90"
          )}
        >
          {formatCurrency(totalMonthlyExpensesCents + totalGoalAllocatedCents)} /{" "}
          {formatCurrency(totalMonthlyIncomeCents)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isZero
              ? "bg-success"
              : isPositive
                ? "bg-warning"
                : "bg-destructive"
          )}
          style={{ width: `${allocatedPercent}%` }}
        />
      </div>
    </div>
  );
}
