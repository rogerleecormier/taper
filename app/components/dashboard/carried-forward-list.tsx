"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { format, parseISO, differenceInDays } from "date-fns";
import { ArrowRight, Clock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useCarriedForwardUnpaid } from "~/hooks/use-occurrences";
import { trackerStore, setShowHidden } from "~/store/tracker-store";
import { OccurrenceDetailModal, type OccurrenceModalItem } from "~/components/tracker/occurrence-detail-modal";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-border bg-muted/50 text-muted-foreground",
  overdue: "border-danger/20 bg-danger/10 text-danger",
  partial: "border-warning/20 bg-warning/10 text-warning",
};

export function CarriedForwardList() {
  const { data: rows = [], isLoading, isError } = useCarriedForwardUnpaid();
  const [modalItem, setModalItem] = useState<OccurrenceModalItem | null>(null);
  const showHidden = useStore(trackerStore, (s) => s.showHidden);
  const visibleRows = rows.filter((r) => !r.hidden || showHidden);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-danger">
        <AlertCircle className="mb-2 h-7 w-7 opacity-60" />
        <p className="text-sm font-medium">Failed to load carried balances</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (visibleRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <ArrowRight className="mb-2 h-7 w-7 opacity-30" />
        <p className="text-sm font-medium">No carried-forward expenses</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">All carried balances have been settled</p>
      </div>
    );
  }

  const today = new Date();

  return (
    <>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Carried Forward
        </h3>
        <button
          onClick={() => setShowHidden(!showHidden)}
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left">
              <Th>Expense</Th>
              <Th>Vendor</Th>
              <Th>Category</Th>
              <Th>Originally Due</Th>
              <Th>Age</Th>
              <Th>Scheduled For</Th>
              <Th right>Balance</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visibleRows.map((row) => {
              const originalDate = parseISO(row.originalDueDate);
              const scheduledDate = parseISO(row.dueDate);
              const daysOld = differenceInDays(today, originalDate);
              const isScheduledFuture = scheduledDate > today;
              const remaining = row.amountCents - (row.paidAmountCents ?? 0);
              const isOverdue = row.status === "overdue";

              return (
                <tr
                  key={row.occurrenceId}
                  className="hover:bg-muted/10 transition-colors cursor-pointer group"
                  onClick={() =>
                    setModalItem({
                      occurrenceId: row.occurrenceId,
                      billId: row.billId,
                      billName: row.billName,
                      billInterval: row.billInterval,
                      dueDate: row.dueDate,
                      amountCents: row.amountCents,
                      paidAmountCents: row.paidAmountCents,
                      status: row.status,
                      notes: row.notes,
                      carriedFromId: row.carriedFromId,
                      vendorName: row.vendorName,
                      categoryName: row.categoryName,
                      categoryColor: row.categoryColor,
                      originalDueDate: row.originalDueDate,
                      hidden: row.hidden,
                    })
                  }
                >
                  <td className="px-4 py-3 font-medium text-accent transition-colors">
                    <span className="flex items-center gap-1.5 group-hover:underline">
                      {row.billName}
                      {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-danger flex-shrink-0" />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.vendorName ?? <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.categoryName ? (
                      <span className="flex items-center gap-1.5">
                        {row.categoryColor && (
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.categoryColor }} />
                        )}
                        {row.categoryName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-warning font-medium tabular-nums whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      {format(originalDate, "MMM d, yyyy")}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={cn("font-semibold", daysOld > 0 ? "text-danger" : "text-muted-foreground")}>
                      {daysOld === 0 ? "Today" : daysOld > 0 ? `${daysOld}d ago` : `in ${Math.abs(daysOld)}d`}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    <span className={cn(isScheduledFuture ? "text-foreground/60" : "text-foreground/80")}>
                      {format(scheduledDate, "MMM d, yyyy")}
                    </span>
                    {isScheduledFuture && (
                      <span className="ml-1.5 text-xs text-muted-foreground/50">upcoming</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-danger whitespace-nowrap">
                    {formatCurrency(remaining)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[row.status] ?? STATUS_STYLES.pending)}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <OccurrenceDetailModal
        item={modalItem}
        open={!!modalItem}
        onClose={() => setModalItem(null)}
      />
    </>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground", right ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}
