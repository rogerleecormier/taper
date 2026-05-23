import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import type { DashboardData } from "~/server/fn/dashboard";

interface SummaryCardsProps {
  data: DashboardData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const {
    periodLabel,
    totalMonthlyIncomeCents,
    totalMonthlyExpensesCents,
    netBalanceCents,
    unallocatedCents,
    totalGoalAllocatedCents,
  } = data;

  const netIsPositive = netBalanceCents >= 0;
  const unallocatedIsZero = unallocatedCents === 0;
  const unallocatedIsPositive = unallocatedCents > 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Monthly Income */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {periodLabel} Income
              </p>
              <p className="mt-1 text-2xl font-bold text-success">
                {formatCurrency(totalMonthlyIncomeCents)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {periodLabel} Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-destructive">
                {formatCurrency(totalMonthlyExpensesCents)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Balance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Net Balance
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold",
                  netIsPositive ? "text-accent" : "text-destructive"
                )}
              >
                {formatCurrency(netBalanceCents)}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                netIsPositive ? "bg-accent/10" : "bg-destructive/10"
              )}
            >
              <DollarSign
                className={cn(
                  "h-6 w-6",
                  netIsPositive ? "text-accent" : "text-destructive"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Untethered */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Untethered
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold",
                  unallocatedIsZero
                    ? "text-success"
                    : unallocatedIsPositive
                      ? "text-warning"
                      : "text-destructive"
                )}
              >
                {formatCurrency(unallocatedCents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(totalGoalAllocatedCents)} allocated to goals
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                unallocatedIsZero
                  ? "bg-success/10"
                  : unallocatedIsPositive
                    ? "bg-warning/10"
                    : "bg-destructive/10"
              )}
            >
              <Target
                className={cn(
                  "h-6 w-6",
                  unallocatedIsZero
                    ? "text-success"
                    : unallocatedIsPositive
                      ? "text-warning"
                      : "text-destructive"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
