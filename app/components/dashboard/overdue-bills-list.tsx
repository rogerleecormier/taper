import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
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

export function OverdueBillsList({ overdueBills }: OverdueBillsListProps) {
  const [modalItem, setModalItem] = useState<OccurrenceModalItem | null>(null);

  if (overdueBills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <CheckCircle className="mb-2 h-8 w-8 text-success opacity-85" />
        <p className="text-sm font-semibold text-success">No overdue expenses</p>
        <p className="text-xs text-muted-foreground">All caught up!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Overdue Expenses
        </h3>
        <ul className="divide-y border-border">
          {overdueBills.map((bill) => {
            const days = daysOverdue(bill.dueDate);
            const isPartial = bill.status === "partial";
            const remainingCents = bill.amountCents - bill.paidAmountCents;
            return (
              <li
                key={bill.id}
                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/10 rounded-md px-1 -mx-1 transition-colors"
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
                  })
                }
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-danger" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{bill.billName}</p>
                  <p className="text-xs font-medium text-danger">
                    {days === 0 ? "Due today" : `${days} day${days !== 1 ? "s" : ""} overdue`}
                  </p>
                  {isPartial && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(bill.paidAmountCents)} of {formatCurrency(bill.amountCents)} paid
                    </p>
                  )}
                </div>

                <span className="flex-shrink-0 text-sm font-bold tabular-nums text-danger">
                  {formatCurrency(isPartial ? remainingCents : bill.amountCents)}
                </span>

                <span className="flex-shrink-0 rounded-md border border-danger/20 bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                  {isPartial ? "Partial" : "Overdue"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <OccurrenceDetailModal
        item={modalItem}
        open={!!modalItem}
        onClose={() => setModalItem(null)}
      />
    </>
  );
}
