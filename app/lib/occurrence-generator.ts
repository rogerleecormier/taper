import {
  parseISO,
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  setDate,
  isAfter,
  isBefore,
  isEqual,
  min as dateMin,
  max as dateMax,
  clamp,
} from "date-fns";

export type RecurrenceInterval =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "standalone";

export type RecurrenceRule = {
  interval: RecurrenceInterval;
  startDate: string;
  endDate?: string | null;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
};

function toDate(str: string): Date {
  return parseISO(str);
}

function toStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function inWindow(date: Date, windowStart: Date, windowEnd: Date): boolean {
  return (
    (isAfter(date, windowStart) || isEqual(date, windowStart)) &&
    (isBefore(date, windowEnd) || isEqual(date, windowEnd))
  );
}

function clampMonthDay(year: number, month: number, day: number): Date {
  const lastDay = endOfMonth(new Date(year, month, 1)).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

export function generateOccurrenceDates(
  rule: RecurrenceRule,
  windowStart: string,
  windowEnd: string
): string[] {
  const ws = toDate(windowStart);
  const we = toDate(windowEnd);
  const ruleStart = toDate(rule.startDate);
  const ruleEnd = rule.endDate ? toDate(rule.endDate) : null;

  const effectiveEnd = ruleEnd ? dateMin([ruleEnd, we]) : we;
  const effectiveStart = dateMax([ruleStart, ws]);

  if (isAfter(effectiveStart, effectiveEnd)) return [];

  const results: string[] = [];

  switch (rule.interval) {
    case "standalone": {
      if (inWindow(ruleStart, ws, we)) {
        results.push(toStr(ruleStart));
      }
      break;
    }

    case "daily": {
      let current = effectiveStart;
      while (!isAfter(current, effectiveEnd)) {
        results.push(toStr(current));
        current = addDays(current, 1);
      }
      break;
    }

    case "weekly": {
      const targetDay =
        rule.dayOfWeek !== null && rule.dayOfWeek !== undefined
          ? rule.dayOfWeek
          : getDay(ruleStart);

      // Find the first occurrence on or after ruleStart on targetDay
      let anchor = ruleStart;
      while (getDay(anchor) !== targetDay) {
        anchor = addDays(anchor, 1);
      }

      // If anchor is before effectiveStart, step forward by 7s
      while (isBefore(anchor, effectiveStart)) {
        anchor = addDays(anchor, 7);
      }

      let current = anchor;
      while (!isAfter(current, effectiveEnd)) {
        results.push(toStr(current));
        current = addDays(current, 7);
      }
      break;
    }

    case "biweekly": {
      const targetDay =
        rule.dayOfWeek !== null && rule.dayOfWeek !== undefined
          ? rule.dayOfWeek
          : getDay(ruleStart);

      // Find the first biweekly occurrence on or after ruleStart
      let anchor = ruleStart;
      while (getDay(anchor) !== targetDay) {
        anchor = addDays(anchor, 1);
      }

      // Step forward by 14s until we reach the effective window
      while (isBefore(anchor, effectiveStart)) {
        anchor = addDays(anchor, 14);
      }

      let current = anchor;
      while (!isAfter(current, effectiveEnd)) {
        results.push(toStr(current));
        current = addDays(current, 14);
      }
      break;
    }

    case "monthly": {
      const targetDay =
        rule.dayOfMonth !== null && rule.dayOfMonth !== undefined
          ? rule.dayOfMonth
          : ruleStart.getDate();

      // Enumerate months in [effectiveStart, effectiveEnd]
      let month = startOfMonth(effectiveStart);
      const lastMonth = startOfMonth(effectiveEnd);

      while (!isAfter(month, lastMonth)) {
        const occurrence = clampMonthDay(
          month.getFullYear(),
          month.getMonth(),
          targetDay
        );

        if (inWindow(occurrence, effectiveStart, effectiveEnd)) {
          results.push(toStr(occurrence));
        }

        month = addMonths(month, 1);
      }
      break;
    }
  }

  return results.sort();
}
