"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Wallet, Receipt } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { TrackerRowDragHandle } from "./tracker-row-drag-handle";
import { TrackerOccurrenceRow } from "./tracker-occurrence-row";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "One-time",
};

interface TrackerParentRowProps {
  dndId: string;
  type: "income" | "bill";
  name: string;
  interval: string;
  defaultAmountCents: number;
  periodTotal: number;
  categoryName: string | null;
  categoryColor: string | null;
  vendorName: string | null;
  occurrences: BillOccurrence[] | IncomeOccurrence[];
  paymentsByOccurrenceId?: Map<string, BillPayment[]>;
}

export function TrackerParentRow({
  dndId,
  type,
  name,
  interval,
  defaultAmountCents,
  periodTotal,
  categoryName,
  categoryColor,
  vendorName,
  occurrences,
  paymentsByOccurrenceId,
}: TrackerParentRowProps) {
  const [expanded, setExpanded] = useState(true);
  const isIncome = type === "income";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dndId });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const Icon = isIncome ? Wallet : Receipt;
  const displayTotal = periodTotal > 0 ? periodTotal : defaultAmountCents;

  const meta = [vendorName, categoryName].filter(Boolean).join(" · ");
  const entityId = dndId.split(":")[1];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("border-b bg-background", isDragging && "z-50 shadow-md opacity-80")}
    >
      {/* Parent header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Drag handle — stop click propagation so it doesn't toggle expand */}
        <div onClick={(e) => e.stopPropagation()}>
          <TrackerRowDragHandle attributes={attributes} listeners={listeners} />
        </div>

        <Icon className={cn("h-4 w-4 flex-shrink-0", isIncome ? "text-green-500" : "text-red-400")} />

        {categoryColor && (
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
        )}

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{name}</span>
          {meta && (
            <span className="ml-2 text-xs text-muted-foreground truncate">{meta}</span>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          {isIncome ? (
            <Link
              to="/income/$id"
              params={{ id: entityId }}
              className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Edit Series
            </Link>
          ) : (
            <Link
              to="/bills"
              className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Edit Series
            </Link>
          )}
        </div>

        <span className="flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {INTERVAL_LABELS[interval] ?? interval}
        </span>

        <span className={cn("flex-shrink-0 tabular-nums text-sm font-semibold", isIncome ? "text-green-600" : "text-red-600")}>
          {formatCurrency(displayTotal)}
        </span>

        {occurrences.length > 0 && (
          <span className="flex-shrink-0 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
            {occurrences.length}
          </span>
        )}

        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        }
      </div>

      {/* Child occurrence rows */}
      {expanded && (
        <div className="border-t border-dashed border-muted">
          {occurrences.length === 0 ? (
            <p className="px-10 py-2 text-xs italic text-muted-foreground">
              No occurrences in this period
            </p>
          ) : (
            (occurrences as (BillOccurrence | IncomeOccurrence)[]).map((occ) => (
              <TrackerOccurrenceRow
                key={occ.id}
                occurrence={occ}
                type={type}
                billName={name}
                interval={interval}
                payments={
                  type === "bill" && paymentsByOccurrenceId
                    ? (paymentsByOccurrenceId.get(occ.id) ?? [])
                    : []
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
