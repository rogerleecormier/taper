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
} from "date-fns";

export type TrackerInterval = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

export function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDateStr(dateStr: string): Date {
  return parseISO(dateStr);
}

export function isValidDateStr(dateStr: string): boolean {
  return isValid(parseISO(dateStr));
}

export function getPeriodEnd(
  interval: TrackerInterval,
  periodStart: Date
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
  }
}

export function getTrackerColumns(
  interval: TrackerInterval,
  periodStart: Date
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
  }

  return columns;
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
