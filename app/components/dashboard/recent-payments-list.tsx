import { CreditCard } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { Link } from "@tanstack/react-router";
import type { DashboardData } from "~/server/fn/dashboard";

interface RecentPaymentsListProps {
  recentPayments: DashboardData["recentPayments"];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecentPaymentsList({ recentPayments }: RecentPaymentsListProps) {
  if (recentPayments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <CreditCard className="mb-2 h-8 w-8 opacity-40" />
        <p className="text-sm">No recent payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent Payments
      </h3>
      <ul className="divide-y border-border">
        {recentPayments.map((payment) => (
          <li key={payment.id} className="py-3">
            {/* Row 1: name + amount */}
            <div className="flex items-center gap-3">
              <Link
                to="/bills/$id"
                params={{ id: payment.billId }}
                className="flex-1 text-sm font-medium text-foreground hover:text-accent transition-colors"
              >
                {payment.billName}
              </Link>
              <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(payment.paidAmountCents)}
              </span>
            </div>

            {/* Row 2: vendor | badge + date */}
            <div className="flex items-center gap-2 mt-1">
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
    </div>
  );
}
