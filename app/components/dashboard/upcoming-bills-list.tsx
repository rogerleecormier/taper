"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import { CalendarClock } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { formatRelativeDate, toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import { trackerStore } from "~/store/tracker-store";
import type { DashboardData } from "~/server/fn/dashboard";

type UpcomingBill = DashboardData["upcomingBills"][number];

interface UpcomingBillsListProps {
  upcomingBills: DashboardData["upcomingBills"];
}

type DayFilter = 7 | 14 | 30;

const STATUS_CLASSES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-green-200 bg-green-50 text-green-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
  skipped: "border-gray-200 bg-gray-50 text-gray-500",
};

function getFilteredBills(bills: UpcomingBill[], days: DayFilter, referenceDate: Date) {
  const referenceStr = toDateStr(referenceDate);
  const todayStr = toDateStr(new Date());
  const startStr = referenceStr > todayStr ? referenceStr : todayStr;
  const cutoff = new Date(`${startStr}T00:00:00`);
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = toDateStr(cutoff);
  return bills.filter((b) => b.dueDate >= startStr && b.dueDate <= cutoffStr);
}

export function UpcomingBillsList({ upcomingBills }: UpcomingBillsListProps) {
  const [selectedDays, setSelectedDays] = useState<DayFilter>(7);
  const referenceDate = useStore(trackerStore, (s) => s.periodStart);

  const filtered = getFilteredBills(upcomingBills, selectedDays, referenceDate);

  return (
    <div className="space-y-3">
      {/* Day toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Upcoming Expenses
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <CalendarClock className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No upcoming expenses in this period</p>
        </div>
      ) : (
        <ul className="divide-y">
          {filtered.map((bill) => (
            <li key={bill.id} className="flex items-center gap-3 py-3">
              {/* Category color dot */}
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: bill.categoryColor ?? "#94a3b8",
                }}
              />

              {/* Bill info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{bill.billName}</p>
                {bill.vendorName && (
                  <p className="truncate text-xs text-muted-foreground">
                    {bill.vendorName}
                  </p>
                )}
              </div>

              {/* Due date */}
              <span className="flex-shrink-0 text-xs text-muted-foreground">
                {formatRelativeDate(bill.dueDate, referenceDate)}
              </span>

              {/* Amount */}
              <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(bill.amountCents)}
              </span>

              {/* Status badge */}
              <span
                className={cn(
                  "flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold capitalize",
                  STATUS_CLASSES[bill.status] ?? STATUS_CLASSES.pending
                )}
              >
                {bill.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
