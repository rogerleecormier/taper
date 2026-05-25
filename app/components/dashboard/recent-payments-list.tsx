import { useState } from "react";
import { CreditCard } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import { Link } from "@tanstack/react-router";
import type { DashboardData } from "~/server/fn/dashboard";

interface RecentPaymentsListProps {
  recentPayments: DashboardData["recentPayments"];
}

const PAGE_SIZE = 5;

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecentPaymentsList({ recentPayments }: RecentPaymentsListProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(recentPayments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = recentPayments.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent Payments
        </h3>
      </div>

      {recentPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <CreditCard className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No recent payments</p>
        </div>
      ) : (
        <div className="space-y-2">
          <ul className="divide-y border-border">
            {paginated.map((payment) => (
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  safePage === 1
                    ? "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground/60"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  safePage === totalPages
                    ? "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground/60"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
