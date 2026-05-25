import { useState } from "react";
import { CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";
import { OccurrenceDetailModal, type OccurrenceModalItem } from "~/components/tracker/occurrence-detail-modal";
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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OverdueBillsList({ overdueBills }: OverdueBillsListProps) {
  const [modalItem, setModalItem] = useState<OccurrenceModalItem | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const visibleBills = overdueBills.filter((b) => !b.hidden || showHidden);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Overdue Expenses
          </h3>
          <button
            onClick={() => setShowHidden((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              showHidden
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-muted/50 text-muted-foreground hover:border-accent/30 hover:text-accent"
            )}
          >
            {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {showHidden ? "Hiding Hidden" : "Show Hidden"}
          </button>
        </div>
        {visibleBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <CheckCircle className="mb-2 h-8 w-8 text-success opacity-85" />
            <p className="text-sm font-semibold text-success">No overdue expenses</p>
            <p className="text-xs text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <ul className="divide-y border-border">
            {visibleBills.map((bill) => {
              const days = daysOverdue(bill.dueDate);
              const isPartial = bill.status === "partial";
              const remainingCents = bill.amountCents - bill.paidAmountCents;
              return (
                <li
                  key={bill.id}
                  className="py-3 cursor-pointer hover:bg-muted/10 rounded-md px-1 -mx-1 transition-colors"
                  onClick={() =>
                    setModalItem({
                      occurrenceId: bill.id,
                      billId: bill.billId,
                      billName: bill.billName,
                      billInterval: "monthly",
                      dueDate: bill.dueDate,
                      amountCents: bill.amountCents,
                      paidAmountCents: bill.paidAmountCents,
                      status: bill.status,
                      notes: null,
                      carriedFromId: null,
                      vendorName: null,
                      categoryName: null,
                      categoryColor: null,
                      hidden: bill.hidden,
                    })
                  }
                >
                  {/* Row 1: icon + name + amount */}
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger" />
                    <span className="flex-1 text-sm font-medium text-foreground">{bill.billName}</span>
                    <span className="flex-shrink-0 text-sm font-bold tabular-nums text-danger">
                      {formatCurrency(isPartial ? remainingCents : bill.amountCents)}
                    </span>
                  </div>

                  {/* Row 2: overdue label + partial info | badge + date */}
                  <div className="flex items-center gap-2 mt-1 pl-7">
                    <span className="flex-1 text-xs font-medium text-danger">
                      {days === 0 ? "Due today" : `${days} day${days !== 1 ? "s" : ""} overdue`}
                      {isPartial && (
                        <span className="text-muted-foreground font-normal ml-1.5">
                          · {formatCurrency(bill.paidAmountCents)} of {formatCurrency(bill.amountCents)} paid
                        </span>
                      )}
                    </span>
                    <span className="flex-shrink-0 rounded-md border border-danger/20 bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                      {isPartial ? "Partial" : "Overdue"}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {formatDate(bill.dueDate)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <OccurrenceDetailModal
        item={modalItem}
        open={!!modalItem}
        onClose={() => setModalItem(null)}
      />
    </>
  );
}
