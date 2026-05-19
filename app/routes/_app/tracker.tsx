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
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { TrackerContainer } from "~/components/tracker/tracker-container";
import {
  BudgetBoardView,
  type BudgetBoardInterval,
  type BudgetScope,
} from "~/components/tracker/budget-board-view";
import type { TrackerInterval } from "~/lib/dates";
import { getMostRecentPayday, fromDateStr } from "~/lib/dates";
import { usePreferences, DEFAULT_PREFS, type UserPreferences } from "~/hooks/use-preferences";

export const Route = createFileRoute("/_app/tracker")({
  component: TrackerPage,
});

const MONTH_INTERVALS: Array<{ value: BudgetBoardInterval; label: string }> = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "biweek", label: "Biweeks" },
  { value: "month", label: "Month" },
  { value: "pay-period", label: "Pay Period" },
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
  if (interval === "pay-period") return "pay-period";
  return "monthly";
}

function navigatePeriod(
  scope: BudgetScope,
  interval: BudgetBoardInterval,
  periodStart: Date,
  dir: "prev" | "next",
  paydayInterval: "weekly" | "biweekly" = "biweekly"
) {
  const n = dir === "next" ? 1 : -1;

  if (scope === "month") {
    if (interval === "day") return n > 0 ? addDays(periodStart, 1) : subDays(periodStart, 1);
    if (interval === "week") return n > 0 ? addWeeks(periodStart, 1) : subWeeks(periodStart, 1);
    if (interval === "biweek") return n > 0 ? addWeeks(periodStart, 2) : subWeeks(periodStart, 2);
    if (interval === "pay-period") {
      const days = paydayInterval === "weekly" ? 7 : 14;
      return addDays(periodStart, n * days);
    }
    return n > 0 ? addMonths(periodStart, 1) : subMonths(periodStart, 1);
  }

  if (interval === "month") return n > 0 ? addMonths(periodStart, 1) : subMonths(periodStart, 1);
  if (interval === "quarter") return n > 0 ? addMonths(periodStart, 3) : subMonths(periodStart, 3);
  if (interval === "half") return n > 0 ? addMonths(periodStart, 6) : subMonths(periodStart, 6);
  return n > 0 ? addYears(periodStart, 1) : subYears(periodStart, 1);
}

function getPeriodLabel(
  scope: BudgetScope,
  interval: BudgetBoardInterval,
  periodStart: Date,
  paydayInterval: "weekly" | "biweekly" = "biweekly"
) {
  if (scope === "month") {
    if (interval === "day") return format(periodStart, "MMM d, yyyy");
    if (interval === "week") return `Week of ${format(periodStart, "MMM d, yyyy")}`;
    if (interval === "biweek") return `${format(periodStart, "MMM d")} - ${format(addDays(periodStart, 13), "MMM d, yyyy")}`;
    if (interval === "pay-period") {
      const days = paydayInterval === "weekly" ? 7 : 14;
      return `${format(periodStart, "MMM d")} – ${format(addDays(periodStart, days - 1), "MMM d, yyyy")}`;
    }
    return format(periodStart, "MMMM yyyy");
  }
  if (interval === "year") return format(periodStart, "yyyy");
  return `Year ${format(periodStart, "yyyy")}`;
}

function getRangeStartContainingToday(
  interval: BudgetBoardInterval,
  paydayInterval?: "weekly" | "biweekly",
  paydayAnchorDate?: string | null
): Date {
  const today = new Date();
  if (interval === "day") return startOfDay(today);
  if (interval === "week" || interval === "biweek") return startOfWeek(today);
  if (interval === "pay-period") {
    if (paydayAnchorDate) {
      return fromDateStr(getMostRecentPayday(paydayAnchorDate, paydayInterval ?? "biweekly", today));
    }
    return startOfDay(today);
  }
  return startOfMonth(today);
}

function getCurrentPeriodStart(
  scope: BudgetScope,
  monthInterval: BudgetBoardInterval,
  yearInterval: BudgetBoardInterval,
  paydayInterval?: "weekly" | "biweekly",
  paydayAnchorDate?: string | null
): Date {
  const today = new Date();

  if (scope === "month") {
    if (monthInterval === "day") return startOfDay(today);
    if (monthInterval === "week" || monthInterval === "biweek") return startOfWeek(today);
    if (monthInterval === "pay-period") {
      if (paydayAnchorDate) {
        return fromDateStr(getMostRecentPayday(paydayAnchorDate, paydayInterval ?? "biweekly", today));
      }
      return startOfDay(today);
    }
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
  const { data: prefsData } = usePreferences();
  const prefs: UserPreferences = prefsData ?? DEFAULT_PREFS;
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
      prefs.trackerDefaultYearInterval,
      prefs.paydayInterval,
      prefs.paydayAnchorDate
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
        prefs.trackerDefaultYearInterval,
        prefs.paydayInterval,
        prefs.paydayAnchorDate
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
  const periodLabel = getPeriodLabel(scope, interval, periodStart, prefs.paydayInterval);

  const payPeriodNotConfigured =
    interval === "pay-period" && !prefs.paydayAnchorDate;

  function onScopeChange(nextScope: BudgetScope) {
    setScope(nextScope);
    setPeriodStart(getCurrentPeriodStart(nextScope, monthInterval, yearInterval));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage budget occurrences by period.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3">
          {/* View toggle */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">View</p>
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
              {(["board", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {v === "board" ? "Board" : "List"}
                </button>
              ))}
            </div>
          </div>

          {/* Scope toggle */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scope</p>
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
              {(["month", "year"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onScopeChange(s)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    scope === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {mode === "board" ? "Column size" : "Date range"}
              </p>
              <div className="overflow-x-auto">
                <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
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
                          if (opt.value === "pay-period") {
                            setPeriodStart(
                              getRangeStartContainingToday("pay-period", prefs.paydayInterval, prefs.paydayAnchorDate)
                            );
                          }
                          return;
                        }
                        setYearInterval(opt.value);
                      }}
                      className={cn(
                        "rounded px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                        interval === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pay Period not configured nudge */}
        {payPeriodNotConfigured && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Configure your payday in{" "}
              <Link to="/settings" className="font-semibold underline hover:no-underline">
                Settings
              </Link>{" "}
              to use the Pay Period view.
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 border-t px-3 py-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={payPeriodNotConfigured}
            onClick={() => setPeriodStart(navigatePeriod(scope, interval, periodStart, "prev", prefs.paydayInterval))}
            aria-label="Previous period"
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-center text-sm font-medium">{periodLabel}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={payPeriodNotConfigured}
            onClick={() => setPeriodStart(navigatePeriod(scope, interval, periodStart, "next", prefs.paydayInterval))}
            aria-label="Next period"
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!payPeriodNotConfigured && (
        mode === "board" ? (
          <BudgetBoardView scope={scope} interval={interval} periodStart={periodStart} />
        ) : (
          <TrackerContainer interval={listInterval} periodStart={periodStart} showToolbar={false} />
        )
      )}
    </div>
  );
}
