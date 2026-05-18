import { CreditCard } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { formatRelativeDate } from "~/lib/dates";
import type { DashboardData } from "~/server/fn/dashboard";

interface RecentPaymentsListProps {
  recentPayments: DashboardData["recentPayments"];
  referenceDate: Date;
}

export function RecentPaymentsList({
  recentPayments,
  referenceDate,
}: RecentPaymentsListProps) {
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
      <ul className="divide-y">
        {recentPayments.map((payment) => (
          <li key={payment.id} className="flex items-center gap-3 py-3">
            {/* Bill info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{payment.billName}</p>
              {payment.vendorName && (
                <p className="truncate text-xs text-muted-foreground">
                  {payment.vendorName}
                </p>
              )}
            </div>

            {/* Paid date */}
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {formatRelativeDate(payment.paidDate, referenceDate)}
            </span>

            {/* Amount */}
            <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
              {formatCurrency(payment.paidAmountCents)}
            </span>

            {/* Badge */}
            <span className="flex-shrink-0 rounded-md border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              Paid
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
