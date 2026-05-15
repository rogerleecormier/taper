const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(cents: number): string {
  return formatter.format(cents / 100);
}

export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

export type BillInterval =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "standalone";

export function normalizeToMonthlyCents(
  amountCents: number,
  interval: BillInterval
): number {
  switch (interval) {
    case "daily":
      return Math.round(amountCents * 30);
    case "weekly":
      return Math.round(amountCents * (52 / 12));
    case "biweekly":
      return Math.round(amountCents * (26 / 12));
    case "monthly":
      return amountCents;
    case "standalone":
      return Math.round(amountCents / 12);
  }
}
