"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { CalendarClock, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import { trackerStore } from "~/store/tracker-store";
import { OccurrenceDetailModal, type OccurrenceModalItem } from "~/components/tracker/occurrence-detail-modal";
import type { DashboardData } from "~/server/fn/dashboard";

type UpcomingBill = DashboardData["upcomingBills"][number];

interface UpcomingBillsListProps {
  upcomingBills: DashboardData["upcomingBills"];
}

const UPCOMING_WINDOW_DAYS = 30;

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-warning/20 bg-warning/10 text-warning",
  paid: "border-success/20 bg-success/10 text-success",
  overdue: "border-danger/20 bg-danger/10 text-danger",
  skipped: "border-border bg-muted/50 text-muted-foreground",
};

function getFilteredBills(bills: UpcomingBill[], days: number, referenceDate: Date, showHidden: boolean) {
  const referenceStr = toDateStr(referenceDate);
  const todayStr = toDateStr(new Date());
  const startStr = referenceStr > todayStr ? referenceStr : todayStr;
  const cutoff = new Date(`${startStr}T00:00:00`);
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = toDateStr(cutoff);
  return bills.filter((b) => b.dueDate >= startStr && b.dueDate <= cutoffStr && (!b.hidden || showHidden));
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UpcomingBillsList({ upcomingBills }: UpcomingBillsListProps) {
  const [modalItem, setModalItem] = useState<OccurrenceModalItem | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [page, setPage] = useState(1);
  const referenceDate = useStore(trackerStore, (s) => s.periodStart);

  const filtered = getFilteredBills(
    upcomingBills,
    UPCOMING_WINDOW_DAYS,
    referenceDate,
    showHidden
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 5));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * 5;
  const visibleRows = filtered.slice(start, start + 5);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Upcoming Expenses
          </h3>
          <div className="flex items-center gap-2">
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
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <CalendarClock className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">No upcoming expenses in this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            <ul className="divide-y">
              {visibleRows.map((bill) => (
                <li
                  key={bill.id}
                  className="group py-3 cursor-pointer hover:bg-muted/10 rounded-md px-1 -mx-1 transition-colors"
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
                      carriedFromId: bill.carriedFromId,
                      vendorName: bill.vendorName,
                      categoryName: bill.categoryName,
                      categoryColor: bill.categoryColor,
                      hidden: bill.hidden,
                    })
                  }
                >
                  {/* Row 1: dot + name + amount */}
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: bill.categoryColor ?? "#94a3b8" }}
                    />
                    <span className="flex-1 text-sm font-medium text-accent group-hover:underline">
                      {bill.billName}
                    </span>
                    <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(bill.amountCents)}
                    </span>
                  </div>

                  {/* Row 2: vendor | badge + date */}
                  <div className="flex items-center gap-2 mt-1 pl-5">
                    <span className="flex-1 text-xs text-muted-foreground">
                      {bill.vendorName ?? ""}
                    </span>
                    <span
                      className={cn(
                        "flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold capitalize",
                        STATUS_CLASSES[bill.status] ?? STATUS_CLASSES.pending
                      )}
                    >
                      {bill.status}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {formatDate(bill.dueDate)}
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

      <OccurrenceDetailModal
        item={modalItem}
        open={!!modalItem}
        onClose={() => setModalItem(null)}
      />
    </>
  );
}
