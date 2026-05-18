import { Store } from "@tanstack/react-store";
import { startOfMonth } from "date-fns";

export type TrackerInterval = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

type TrackerState = {
  interval: TrackerInterval;
  periodStart: Date;
  rowOrder: string[];
  selectedCell: { rowId: string; colDateStr: string } | null;
  showIncome: boolean;
  showBills: boolean;
};

export const trackerStore = new Store<TrackerState>({
  interval: "monthly",
  periodStart: startOfMonth(new Date()),
  rowOrder: [],
  selectedCell: null,
  showIncome: true,
  showBills: true,
});

export function setTrackerInterval(interval: TrackerInterval) {
  trackerStore.setState((s) => ({ ...s, interval }));
}

export function setTrackerPeriodStart(periodStart: Date) {
  trackerStore.setState((s) => ({ ...s, periodStart }));
}

export function setTrackerRowOrder(rowOrder: string[]) {
  trackerStore.setState((s) => ({ ...s, rowOrder }));
}

export function setSelectedCell(
  cell: { rowId: string; colDateStr: string } | null
) {
  trackerStore.setState((s) => ({ ...s, selectedCell: cell }));
}
