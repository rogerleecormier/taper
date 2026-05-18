"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { TrackerInterval } from "~/lib/dates";

interface TrackerToolbarProps {
  interval: TrackerInterval;
  periodStart: Date;
  onIntervalChange: (i: TrackerInterval) => void;
  onPeriodChange: (d: Date) => void;
}

const INTERVALS: { value: TrackerInterval; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

function navigatePeriod(
  interval: TrackerInterval,
  periodStart: Date,
  direction: "prev" | "next"
): Date {
  const sign = direction === "next" ? 1 : -1;
  switch (interval) {
    case "daily":
      return sign > 0 ? addDays(periodStart, 1) : subDays(periodStart, 1);
    case "weekly":
      return sign > 0 ? addWeeks(periodStart, 1) : subWeeks(periodStart, 1);
    case "biweekly":
      return sign > 0 ? addWeeks(periodStart, 2) : subWeeks(periodStart, 2);
    case "monthly":
      return sign > 0
        ? startOfMonth(addMonths(periodStart, 1))
        : startOfMonth(subMonths(periodStart, 1));
    case "yearly":
      return sign > 0
        ? startOfYear(addYears(periodStart, 1))
        : startOfYear(subYears(periodStart, 1));
    case "pay-period":
      return sign > 0 ? addDays(periodStart, 14) : subDays(periodStart, 14);
  }
}

function getPeriodLabel(interval: TrackerInterval, periodStart: Date): string {
  switch (interval) {
    case "daily":
      return format(periodStart, "MMM d, yyyy");
    case "weekly":
      return `Week of ${format(periodStart, "MMM d, yyyy")}`;
    case "biweekly":
      return `${format(periodStart, "MMM d")} – ${format(addDays(periodStart, 13), "MMM d, yyyy")}`;
    case "monthly":
      return format(periodStart, "MMMM yyyy");
    case "yearly":
      return format(periodStart, "yyyy");
    case "pay-period":
      return `${format(periodStart, "MMM d")} – ${format(addDays(periodStart, 13), "MMM d, yyyy")}`;
  }
}

export function TrackerToolbar({
  interval,
  periodStart,
  onIntervalChange,
  onPeriodChange,
}: TrackerToolbarProps) {
  const periodLabel = getPeriodLabel(interval, periodStart);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3">
      {/* Interval selector */}
      <div className="inline-flex rounded-md border bg-muted p-0.5">
        {INTERVALS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onIntervalChange(value)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              interval === value
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPeriodChange(navigatePeriod(interval, periodStart, "prev"))}
          className="h-8 w-8 p-0"
          aria-label="Previous period"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="min-w-40 text-center text-sm font-medium">
          {periodLabel}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPeriodChange(navigatePeriod(interval, periodStart, "next"))}
          className="h-8 w-8 p-0"
          aria-label="Next period"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
