import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  startOfDay,
  startOfQuarter,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { TrackerContainer } from "~/components/tracker/tracker-container";
import {
  BudgetBoardView,
  type BudgetBoardInterval,
  type BudgetScope,
} from "~/components/tracker/budget-board-view";
import type { TrackerInterval } from "~/lib/dates";
import { usePreferences, type UserPreferences } from "~/hooks/use-preferences";

export const Route = createFileRoute("/_app/tracker")({
  component: TrackerPage,
});

const MONTH_INTERVALS: Array<{ value: BudgetBoardInterval; label: string }> = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "biweek", label: "Biweeks" },
  { value: "month", label: "Month" },
];

const YEAR_INTERVALS: Array<{ value: BudgetBoardInterval; label: string }> = [
  { value: "month", label: "Months" },
  { value: "quarter", label: "3 Months" },
  { value: "half", label: "6 Months" },
  { value: "year", label: "Year" },
];

function getListInterval(scope: BudgetScope, interval: BudgetBoardInterval): TrackerInterval {
  if (scope === "year") return "yearly";
  if (interval === "day") return "daily";
  if (interval === "week") return "weekly";
  if (interval === "biweek") return "biweekly";
  return "monthly";
}

function navigatePeriod(
  scope: BudgetScope,
  interval: BudgetBoardInterval,
  periodStart: Date,
  dir: "prev" | "next"
) {
  const n = dir === "next" ? 1 : -1;

  if (scope === "month") {
    if (interval === "day") return n > 0 ? addDays(periodStart, 1) : subDays(periodStart, 1);
    if (interval === "week") return n > 0 ? addWeeks(periodStart, 1) : subWeeks(periodStart, 1);
    if (interval === "biweek") return n > 0 ? addWeeks(periodStart, 2) : subWeeks(periodStart, 2);
    return n > 0 ? addMonths(periodStart, 1) : subMonths(periodStart, 1);
  }

  if (interval === "month") return n > 0 ? addMonths(periodStart, 1) : subMonths(periodStart, 1);
  if (interval === "quarter") return n > 0 ? addMonths(periodStart, 3) : subMonths(periodStart, 3);
  if (interval === "half") return n > 0 ? addMonths(periodStart, 6) : subMonths(periodStart, 6);
  return n > 0 ? addYears(periodStart, 1) : subYears(periodStart, 1);
}

function getPeriodLabel(scope: BudgetScope, interval: BudgetBoardInterval, periodStart: Date) {
  if (scope === "month") {
    if (interval === "day") return format(periodStart, "MMM d, yyyy");
    if (interval === "week") return `Week of ${format(periodStart, "MMM d, yyyy")}`;
    if (interval === "biweek") return `${format(periodStart, "MMM d")} - ${format(addDays(periodStart, 13), "MMM d, yyyy")}`;
    return format(periodStart, "MMMM yyyy");
  }
  if (interval === "year") return format(periodStart, "yyyy");
  return `Year ${format(periodStart, "yyyy")}`;
}

function getRangeStartContainingToday(interval: BudgetBoardInterval): Date {
  const today = new Date();
  if (interval === "day") return startOfDay(today);
  if (interval === "week" || interval === "biweek") return startOfWeek(today);
  return startOfMonth(today);
}

function getCurrentPeriodStart(
  scope: BudgetScope,
  monthInterval: BudgetBoardInterval,
  yearInterval: BudgetBoardInterval
): Date {
  const today = new Date();

  if (scope === "month") {
    if (monthInterval === "day") return startOfDay(today);
    if (monthInterval === "week" || monthInterval === "biweek") return startOfWeek(today);
    return startOfMonth(today);
  }

  if (yearInterval === "month") return startOfMonth(today);
  if (yearInterval === "quarter") return startOfQuarter(today);
  if (yearInterval === "half") {
    const month = today.getMonth();
    return new Date(today.getFullYear(), month < 6 ? 0 : 6, 1);
  }
  return startOfYear(today);
}

function TrackerPage() {
  const { data: prefs } = usePreferences();
  return <TrackerContent prefs={prefs} />;
}

function TrackerContent({ prefs }: { prefs: UserPreferences }) {
  const [mode, setMode] = useState<"board" | "list">(prefs.trackerDefaultMode);
  const [scope, setScope] = useState<BudgetScope>(prefs.trackerDefaultScope);
  const [monthInterval, setMonthInterval] = useState<BudgetBoardInterval>(prefs.trackerDefaultMonthInterval);
  const [yearInterval, setYearInterval] = useState<BudgetBoardInterval>(prefs.trackerDefaultYearInterval);
  const [periodStart, setPeriodStart] = useState<Date>(() =>
    getCurrentPeriodStart(
      prefs.trackerDefaultScope,
      prefs.trackerDefaultMonthInterval,
      prefs.trackerDefaultYearInterval
    )
  );

  useEffect(() => {
    setMode(prefs.trackerDefaultMode);
    setScope(prefs.trackerDefaultScope);
    setMonthInterval(prefs.trackerDefaultMonthInterval);
    setYearInterval(prefs.trackerDefaultYearInterval);
    setPeriodStart(
      getCurrentPeriodStart(
        prefs.trackerDefaultScope,
        prefs.trackerDefaultMonthInterval,
        prefs.trackerDefaultYearInterval
      )
    );
  }, [
    prefs.trackerDefaultMode,
    prefs.trackerDefaultScope,
    prefs.trackerDefaultMonthInterval,
    prefs.trackerDefaultYearInterval,
  ]);

  const interval = scope === "month" ? monthInterval : yearInterval;
  const activeIntervals = scope === "month" ? MONTH_INTERVALS : YEAR_INTERVALS;
  const listInterval = getListInterval(scope, interval);
  const periodLabel = getPeriodLabel(scope, interval, periodStart);

  function onScopeChange(nextScope: BudgetScope) {
    setScope(nextScope);
    setPeriodStart(getCurrentPeriodStart(nextScope, monthInterval, yearInterval));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Drag and schedule budget occurrences by period, then manage details in list mode.
        </p>
      </div>

      <div className="space-y-3 rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-end gap-4">
          {/* View toggle */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View</p>
            <div className="inline-flex rounded-md border bg-muted p-0.5">
              {(["board", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === v ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  )}
                >
                  {v === "board" ? "Board" : "List"}
                </button>
              ))}
            </div>
          </div>

          {/* Scope toggle */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</p>
            <div className="inline-flex rounded-md border bg-muted p-0.5">
              {(["month", "year"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onScopeChange(s)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    scope === s ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  )}
                >
                  {s === "month" ? "Month" : "Year"}
                </button>
              ))}
            </div>
          </div>

          {/* Interval toggle — hidden in list+year (the window is always the full year) */}
          {!(mode === "list" && scope === "year") && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {mode === "board" ? "Column size" : "Date range"}
              </p>
              <div className="inline-flex rounded-md border bg-muted p-0.5">
                {activeIntervals.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (scope === "month") {
                        setMonthInterval(opt.value);
                        if (
                          mode === "list" &&
                          (opt.value === "day" || opt.value === "week" || opt.value === "biweek")
                        ) {
                          setPeriodStart(getRangeStartContainingToday(opt.value));
                        }
                        return;
                      }
                      setYearInterval(opt.value);
                    }}
                    className={cn(
                      "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                      interval === opt.value ? "bg-background text-foreground shadow" : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => setPeriodStart(navigatePeriod(scope, interval, periodStart, "prev"))}>
            Prev
          </Button>
          <span className="min-w-48 text-center text-sm font-medium">{periodLabel}</span>
          <Button size="sm" variant="ghost" onClick={() => setPeriodStart(navigatePeriod(scope, interval, periodStart, "next"))}>
            Next
          </Button>
        </div>
      </div>

      {mode === "board" ? (
        <BudgetBoardView scope={scope} interval={interval} periodStart={periodStart} />
      ) : (
        <TrackerContainer interval={listInterval} periodStart={periodStart} showToolbar={false} />
      )}
    </div>
  );
}
