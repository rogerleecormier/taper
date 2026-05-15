import { CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import type { DashboardData } from "~/server/fn/dashboard";

interface OverdueBillsListProps {
  overdueBills: DashboardData["overdueBills"];
}

function daysOverdue(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000));
}

export function OverdueBillsList({ overdueBills }: OverdueBillsListProps) {
  if (overdueBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <CheckCircle className="mb-2 h-8 w-8 text-green-500 opacity-80" />
        <p className="text-sm font-medium text-green-700">No overdue bills</p>
        <p className="text-xs text-muted-foreground">All caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Overdue Bills
      </h3>
      <ul className="divide-y">
        {overdueBills.map((bill) => {
          const days = daysOverdue(bill.dueDate);
          return (
            <li key={bill.id} className="flex items-center gap-3 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />

              {/* Bill info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{bill.billName}</p>
                <p className="text-xs text-red-600">
                  {days === 0 ? "Due today" : `${days} day${days !== 1 ? "s" : ""} overdue`}
                </p>
              </div>

              {/* Amount */}
              <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-red-700">
                {formatCurrency(bill.amountCents)}
              </span>

              {/* Badge */}
              <span className="flex-shrink-0 rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                Overdue
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
