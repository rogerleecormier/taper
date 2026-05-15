import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";

interface TrackerCellProps {
  occurrence: BillOccurrence | IncomeOccurrence | null;
  dateStr: string;
  rowId: string;
  onClick: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800 border-green-200",
  received: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  late: "bg-red-100 text-red-800 border-red-200",
  skipped: "bg-gray-100 text-gray-500 border-gray-200",
};

function getOccurrenceStatus(occ: BillOccurrence | IncomeOccurrence): string {
  return occ.status;
}

function getOccurrenceAmount(occ: BillOccurrence | IncomeOccurrence): number {
  return occ.amountCents;
}

function getStatusDot(status: string): string {
  switch (status) {
    case "paid":
    case "received":
      return "bg-green-500";
    case "pending":
      return "bg-amber-400";
    case "overdue":
    case "late":
      return "bg-red-500";
    case "skipped":
      return "bg-gray-400";
    default:
      return "bg-gray-300";
  }
}

export function TrackerCell({ occurrence, onClick }: TrackerCellProps) {
  if (!occurrence) {
    return (
      <div
        className="flex min-w-24 flex-shrink-0 cursor-pointer items-center justify-center border-r p-1 last:border-r-0 hover:bg-gray-50"
        onClick={onClick}
      >
        <span className="text-xs text-gray-300">—</span>
      </div>
    );
  }

  const status = getOccurrenceStatus(occurrence);
  const amount = getOccurrenceAmount(occurrence);
  const styleClass = STATUS_STYLES[status] ?? "bg-transparent text-gray-300";

  return (
    <div
      className={cn(
        "flex min-w-24 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 border border-transparent p-1 transition-opacity hover:opacity-80",
        "border-r last:border-r-0"
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex w-full flex-col items-center rounded px-1 py-1",
          styleClass
        )}
      >
        <div className="flex items-center gap-1">
          <span className={cn("h-1.5 w-1.5 rounded-full", getStatusDot(status))} />
          <span className="text-xs font-medium tabular-nums">
            {formatCurrency(amount)}
          </span>
        </div>
        <span className="text-[10px] capitalize opacity-75">{status}</span>
      </div>
    </div>
  );
}
