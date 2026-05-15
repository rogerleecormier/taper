import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import type { DashboardData } from "~/server/fn/dashboard";

interface UnallocatedBannerProps {
  data: DashboardData;
}

export function UnallocatedBanner({ data }: UnallocatedBannerProps) {
  const { unallocatedCents, totalMonthlyExpensesCents, totalMonthlyIncomeCents } = data;

  const isZero = unallocatedCents === 0;
  const isPositive = unallocatedCents > 0;

  const allocatedPercent =
    totalMonthlyIncomeCents > 0
      ? Math.min(
          100,
          Math.round((totalMonthlyExpensesCents / totalMonthlyIncomeCents) * 100)
        )
      : 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isZero
          ? "border-green-200 bg-green-50"
          : isPositive
            ? "border-amber-200 bg-amber-50"
            : "border-red-200 bg-red-50"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          {isZero ? (
            <p className="font-semibold text-green-800">
              Every dollar is allocated! 🎯
            </p>
          ) : isPositive ? (
            <p className="font-semibold text-amber-800">
              {formatCurrency(unallocatedCents)} left to allocate
            </p>
          ) : (
            <p className="font-semibold text-red-800">
              Overspent by {formatCurrency(Math.abs(unallocatedCents))}
            </p>
          )}
          <p
            className={cn(
              "mt-0.5 text-sm",
              isZero
                ? "text-green-700"
                : isPositive
                  ? "text-amber-700"
                  : "text-red-700"
            )}
          >
            {allocatedPercent}% of income allocated
          </p>
        </div>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            isZero
              ? "text-green-700"
              : isPositive
                ? "text-amber-700"
                : "text-red-700"
          )}
        >
          {formatCurrency(totalMonthlyExpensesCents)} /{" "}
          {formatCurrency(totalMonthlyIncomeCents)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isZero
              ? "bg-green-500"
              : isPositive
                ? "bg-amber-500"
                : "bg-red-500"
          )}
          style={{ width: `${allocatedPercent}%` }}
        />
      </div>
    </div>
  );
}
