import { useState } from "react";
import { CreditCard } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import { Link } from "@tanstack/react-router";
import type { DashboardData } from "~/server/fn/dashboard";

interface RecentPaymentsListProps {
  recentPayments: DashboardData["recentPayments"];
}

type DayFilter = 7 | 14 | 30;

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFilteredPayments(
  payments: DashboardData["recentPayments"],
  days: DayFilter
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = toDateStr(cutoff);
  return payments.filter((p) => p.paidDate >= cutoffStr);
}

export function RecentPaymentsList({ recentPayments }: RecentPaymentsListProps) {
  const [selectedDays, setSelectedDays] = useState<DayFilter>(7);

  const filtered = getFilteredPayments(recentPayments, selectedDays);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent Payments
        </h3>
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          {([7, 14, 30] as DayFilter[]).map((days) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                selectedDays === days
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <CreditCard className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No payments in this period</p>
        </div>
      ) : (
        <ul className="divide-y border-border">
          {filtered.map((payment) => (
            <li key={payment.id} className="py-3">
              {/* Row 1: dot + name + amount */}
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: payment.categoryColor ?? "#94a3b8" }}
                />
                <Link
                  to="/bills/$id"
                  params={{ id: payment.billId }}
                  className="flex-1 text-sm font-medium text-accent hover:underline transition-colors"
                >
                  {payment.billName}
                </Link>
                <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(payment.paidAmountCents)}
                </span>
              </div>

              {/* Row 2: vendor | badge + date */}
              <div className="flex items-center gap-2 mt-1 pl-5">
                <span className="flex-1 text-xs text-muted-foreground">
                  {payment.vendorName ?? ""}
                </span>
                <span className="flex-shrink-0 rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                  Paid
                </span>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatDate(payment.paidDate)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
