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
    totalMonthlyIncomeCents,
    totalMonthlyExpensesCents,
    netBalanceCents,
    unallocatedCents,
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
                Monthly Income
              </p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {formatCurrency(totalMonthlyIncomeCents)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
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
                Monthly Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatCurrency(totalMonthlyExpensesCents)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <TrendingDown className="h-6 w-6 text-red-600" />
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
                  netIsPositive ? "text-blue-600" : "text-red-600"
                )}
              >
                {formatCurrency(netBalanceCents)}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                netIsPositive ? "bg-blue-100" : "bg-red-100"
              )}
            >
              <DollarSign
                className={cn(
                  "h-6 w-6",
                  netIsPositive ? "text-blue-600" : "text-red-600"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unallocated */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Unallocated
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold",
                  unallocatedIsZero
                    ? "text-green-600"
                    : unallocatedIsPositive
                      ? "text-amber-600"
                      : "text-red-600"
                )}
              >
                {formatCurrency(unallocatedCents)}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                unallocatedIsZero
                  ? "bg-green-100"
                  : unallocatedIsPositive
                    ? "bg-amber-100"
                    : "bg-red-100"
              )}
            >
              <Target
                className={cn(
                  "h-6 w-6",
                  unallocatedIsZero
                    ? "text-green-600"
                    : unallocatedIsPositive
                      ? "text-amber-600"
                      : "text-red-600"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
