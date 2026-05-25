import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
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
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { TrackerContainer } from "~/components/tracker/tracker-container";
import {
  BudgetCalendarView,
  type BudgetBoardInterval,
  type BudgetScope,
} from "~/components/tracker/budget-calendar-view";
import { YearCalendarView } from "~/components/tracker/year-calendar-view";
import type { TrackerInterval } from "~/lib/dates";
import { getMostRecentPayday, fromDateStr, toDateStr } from "~/lib/dates";
import { usePreferences, DEFAULT_PREFS, type UserPreferences } from "~/hooks/use-preferences";
import { z } from "zod";
import { setTrackerPeriodStart, setTrackerInterval } from "~/store/tracker-store";

const trackerSearchSchema = z.object({
  mode: z.enum(["board", "calendar", "list"]).optional(),
  scope: z.enum(["month", "year"]).optional(),
  monthInterval: z.enum(["day", "week", "biweek", "month", "pay-period"]).optional(),
  yearInterval: z.enum(["month", "quarter", "half", "year"]).optional(),
  periodStart: z.string().optional(),
});

type MonthInterval = z.infer<typeof trackerSearchSchema>["monthInterval"];
type YearInterval = z.infer<typeof trackerSearchSchema>["yearInterval"];

export const Route = createFileRoute("/_app/tracker")({
  validateSearch: (search) => trackerSearchSchema.parse(search),
  component: TrackerPage,
  head: () => ({
    meta: [
      {
        title: "Tracker - Taper",
      },
      {
        name: "description",
        content: "Track your budget across different time periods",
      },
    ],
  }),
});

const MONTH_INTERVALS: Array<{ value: MonthInterval; label: string }> = [
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "biweek", label: "Biweeks" },
  { value: "month", label: "Month" },
  { value: "pay-period", label: "Pay Period" },
];

const YEAR_INTERVALS: Array<{ value: YearInterval; label: string }> = [
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
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  let mode = search.mode ?? prefs.trackerDefaultMode;
  if (mode === "board") mode = "calendar";
  const scope = search.scope ?? prefs.trackerDefaultScope;
  const monthInterval = search.monthInterval ?? prefs.trackerDefaultMonthInterval;
  const yearInterval = search.yearInterval ?? prefs.trackerDefaultYearInterval;

  const periodStart = useMemo(() => {
    if (search.periodStart) {
      return fromDateStr(search.periodStart);
    }
    return getCurrentPeriodStart(
      scope,
      monthInterval,
      yearInterval,
      prefs.paydayInterval,
      prefs.paydayAnchorDate
    );
  }, [
    search.periodStart,
    scope,
    monthInterval,
    yearInterval,
    prefs.paydayInterval,
    prefs.paydayAnchorDate,
  ]);

  const interval = scope === "month" ? monthInterval : yearInterval;
  const activeIntervals = scope === "month" ? MONTH_INTERVALS : YEAR_INTERVALS;
  const listInterval = getListInterval(scope, interval);
  // Calendar mode always navigates whole months/years regardless of sub-interval
  const navInterval: BudgetBoardInterval =
    mode === "calendar" ? (scope === "year" ? "year" : "month") : interval;
  const periodLabel =
    mode === "calendar"
      ? scope === "year"
        ? format(periodStart, "yyyy")
        : format(periodStart, "MMMM yyyy")
      : getPeriodLabel(scope, interval, periodStart, prefs.paydayInterval);

  const payPeriodNotConfigured =
    interval === "pay-period" && !prefs.paydayAnchorDate;

  // Sync selected period to global trackerStore so Dashboard/other routes stay in sync
  useEffect(() => {
    setTrackerPeriodStart(periodStart);
    setTrackerInterval(listInterval);
  }, [periodStart, listInterval]);

  function onScopeChange(nextScope: BudgetScope) {
    const nextStart = getCurrentPeriodStart(
      nextScope,
      monthInterval,
      yearInterval,
      prefs.paydayInterval,
      prefs.paydayAnchorDate
    );
    navigate({
      search: (prev) => ({
        ...prev,
        scope: nextScope,
        periodStart: toDateStr(nextStart),
      }),
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">Budget Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage budget occurrences by period.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3">
          {/* View toggle */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">View</p>
            <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
              {([
                { value: "calendar", label: "Calendar" },
                { value: "list", label: "Timeline Flow" }
              ] as const).map((v) => (
                <button
                  key={v.value}
                  onClick={() => navigate({ search: (prev) => ({ ...prev, mode: v.value }) })}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-semibold transition-all duration-200 cursor-pointer",
                    mode === v.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scope toggle */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scope</p>
            <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
              {(["month", "year"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onScopeChange(s)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-semibold transition-all duration-200 cursor-pointer",
                    scope === s ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === "month" ? "Month" : "Year"}
                </button>
              ))}
            </div>
          </div>

          {/* Interval toggle — hidden in list+year, and also in calendar mode */}
          {mode !== "calendar" && !(mode === "list" && scope === "year") && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Date range
              </p>
              <div className="overflow-x-auto">
                <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
                  {activeIntervals.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (scope === "month") {
                          const monthValue = opt.value as MonthInterval;
                          let nextStart = periodStart;
                          if (
                            mode === "list" &&
                            (monthValue === "day" || monthValue === "week" || monthValue === "biweek")
                          ) {
                            nextStart = getRangeStartContainingToday(monthValue);
                          }
                          if (monthValue === "month") {
                            nextStart = startOfMonth(periodStart);
                          }
                          if (monthValue === "pay-period") {
                            nextStart = getRangeStartContainingToday("pay-period", prefs.paydayInterval, prefs.paydayAnchorDate);
                          }
                          navigate({
                            search: (prev) => ({
                              ...prev,
                              monthInterval: monthValue,
                              periodStart: toDateStr(nextStart),
                            }),
                          });
                          return;
                        }
                        const yearValue = opt.value as YearInterval;
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            yearInterval: yearValue,
                          }),
                        });
                      }}
                      className={cn(
                        "rounded px-3 py-1.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer",
                        interval === opt.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
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
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning font-semibold">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Configure your payday in{" "}
              <Link to="/settings" className="font-bold underline hover:no-underline text-accent">
                Settings
              </Link>{" "}
              to use the Pay Period view.
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 border-t border-border px-3 py-2 bg-muted/10">
          <Button
            size="sm"
            variant="ghost"
            disabled={payPeriodNotConfigured}
            onClick={() => {
              const nextStart = navigatePeriod(scope, navInterval, periodStart, "prev", prefs.paydayInterval);
              navigate({
                search: (prev) => ({
                  ...prev,
                  periodStart: toDateStr(nextStart),
                }),
              });
            }}
            aria-label="Previous period"
            className="h-8 w-8 p-0 flex-shrink-0 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-center text-sm font-bold font-heading text-foreground">{periodLabel}</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={payPeriodNotConfigured}
            onClick={() => {
              const nextStart = navigatePeriod(scope, navInterval, periodStart, "next", prefs.paydayInterval);
              navigate({
                search: (prev) => ({
                  ...prev,
                  periodStart: toDateStr(nextStart),
                }),
              });
            }}
            aria-label="Next period"
            className="h-8 w-8 p-0 flex-shrink-0 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!payPeriodNotConfigured && (
        mode === "calendar" ? (
          scope === "year" ? (
            <YearCalendarView periodStart={periodStart} />
          ) : (
            <BudgetCalendarView scope={scope} interval={interval} periodStart={periodStart} />
          )
        ) : (
          <TrackerContainer interval={listInterval} periodStart={periodStart} showToolbar={false} />
        )
      )}
    </div>
  );
}
