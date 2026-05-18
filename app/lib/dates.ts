import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  parseISO,
  isValid,
  differenceInDays,
} from "date-fns";

export type TrackerInterval = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "pay-period";

export function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDateStr(dateStr: string): Date {
  return parseISO(dateStr);
}

export function isValidDateStr(dateStr: string): boolean {
  return isValid(parseISO(dateStr));
}

/**
 * Given a known payday anchor date and interval, returns the most recent payday
 * on or before today (or a provided reference date).
 */
export function getMostRecentPayday(
  anchorDate: string,
  paydayInterval: "weekly" | "biweekly",
  today: Date = new Date()
): string {
  const anchor = parseISO(anchorDate);
  const intervalDays = paydayInterval === "weekly" ? 7 : 14;
  const daysSinceAnchor = differenceInDays(startOfDay(today), startOfDay(anchor));
  const periodsPassed = Math.floor(daysSinceAnchor / intervalDays);
  return toDateStr(addDays(anchor, periodsPassed * intervalDays));
}

export function getPeriodEnd(
  interval: TrackerInterval,
  periodStart: Date,
  paydayInterval?: "weekly" | "biweekly"
): Date {
  switch (interval) {
    case "daily":
      return endOfDay(periodStart);
    case "weekly":
      return endOfDay(addDays(periodStart, 6));
    case "biweekly":
      return endOfDay(addDays(periodStart, 13));
    case "monthly":
      return endOfMonth(periodStart);
    case "yearly":
      return endOfYear(periodStart);
    case "pay-period": {
      const days = paydayInterval === "weekly" ? 7 : 14;
      return endOfDay(addDays(periodStart, days - 1));
    }
  }
}

export function getTrackerColumns(
  interval: TrackerInterval,
  periodStart: Date,
  paydayInterval?: "weekly" | "biweekly"
): Array<{ label: string; dateStr: string; start: Date }> {
  const columns: Array<{ label: string; dateStr: string; start: Date }> = [];

  switch (interval) {
    case "daily": {
      for (let i = 0; i < 14; i++) {
        const d = addDays(periodStart, i);
        columns.push({
          label: format(d, "MMM d"),
          dateStr: toDateStr(d),
          start: d,
        });
      }
      break;
    }
    case "weekly": {
      for (let i = 0; i < 12; i++) {
        const d = addWeeks(periodStart, i);
        columns.push({
          label: `Week of ${format(d, "MMM d")}`,
          dateStr: toDateStr(d),
          start: d,
        });
      }
      break;
    }
    case "biweekly": {
      for (let i = 0; i < 12; i++) {
        const start = addWeeks(periodStart, i * 2);
        const end = addDays(start, 13);
        columns.push({
          label: `${format(start, "MMM d")} – ${format(end, "MMM d")}`,
          dateStr: toDateStr(start),
          start,
        });
      }
      break;
    }
    case "monthly": {
      for (let i = 0; i < 12; i++) {
        const d = addMonths(periodStart, i);
        const ms = startOfMonth(d);
        columns.push({
          label: format(ms, "MMM yyyy"),
          dateStr: toDateStr(ms),
          start: ms,
        });
      }
      break;
    }
    case "pay-period": {
      const days = paydayInterval === "weekly" ? 7 : 14;
      const end = addDays(periodStart, days - 1);
      columns.push({
        label: `${format(periodStart, "MMM d")} – ${format(end, "MMM d")}`,
        dateStr: toDateStr(periodStart),
        start: periodStart,
      });
      break;
    }
  }

  return columns;
}

export function nextOccurrenceDate(dueDate: string, interval: string): string {
  const d = parseISO(dueDate);
  switch (interval) {
    case "daily":       return toDateStr(addDays(d, 1));
    case "weekly":      return toDateStr(addDays(d, 7));
    case "biweekly":    return toDateStr(addDays(d, 14));
    case "pay-period":  return toDateStr(addDays(d, 14));
    case "monthly":     return toDateStr(addMonths(d, 1));
    case "yearly":      return toDateStr(addMonths(d, 12));
    default:            return toDateStr(addMonths(d, 1));
  }
}

export function formatRelativeDate(dateStr: string, referenceDate: Date = new Date()): string {
  const date = parseISO(dateStr);
  const today = startOfDay(referenceDate);
  const diff = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return format(date, "MMM d, yyyy");
}
