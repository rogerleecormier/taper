"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Receipt, Wallet } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import type { TrackerRow as TrackerRowType } from "~/hooks/use-tracker";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import { TrackerRowDragHandle } from "./tracker-row-drag-handle";
import { TrackerCell } from "./tracker-cell";
import { TrackerCellPopover } from "./tracker-cell-popover";

interface TrackerRowProps {
  row: TrackerRowType;
  columns: Array<{ dateStr: string; label: string }>;
  billOccurrenceMap: Map<string, Map<string, BillOccurrence>>;
  incomeOccurrenceMap: Map<string, Map<string, IncomeOccurrence>>;
}

export function TrackerRow({
  row,
  columns,
  billOccurrenceMap,
  incomeOccurrenceMap,
}: TrackerRowProps) {
  const entityId = row.id.split(":")[1];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [openCell, setOpenCell] = useState<string | null>(null);

  function getOccurrence(dateStr: string): BillOccurrence | IncomeOccurrence | null {
    if (row.type === "bill") {
      return billOccurrenceMap.get(entityId)?.get(dateStr) ?? null;
    }
    return incomeOccurrenceMap.get(entityId)?.get(dateStr) ?? null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex border-b bg-background transition-shadow",
        isDragging && "z-50 shadow-lg opacity-80"
      )}
    >
      {/* Row label cell */}
      <div className="flex w-64 flex-shrink-0 items-center gap-2 border-r px-2 py-1.5">
        <TrackerRowDragHandle attributes={attributes} listeners={listeners} />

        {/* Type icon */}
        {row.type === "bill" ? (
          <Receipt className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
        ) : (
          <Wallet className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
        )}

        {/* Category color dot */}
        {row.categoryColor && (
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: row.categoryColor }}
          />
        )}

        {/* Name & meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{row.name}</p>
          <div className="flex items-center gap-1">
            {row.vendorName && (
              <span className="truncate text-xs text-muted-foreground">
                {row.vendorName}
              </span>
            )}
            {row.vendorName && row.categoryName && (
              <span className="text-xs text-muted-foreground">·</span>
            )}
            {row.categoryName && (
              <span className="truncate text-xs text-muted-foreground">
                {row.categoryName}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        <span
          className={cn(
            "flex-shrink-0 text-xs font-semibold tabular-nums",
            row.type === "bill" ? "text-red-600" : "text-green-600"
          )}
        >
          {formatCurrency(row.amountCents)}
        </span>
      </div>

      {/* Data cells */}
      <div className="flex flex-1">
        {columns.map((col) => {
          const occurrence = getOccurrence(col.dateStr);
          const cellKey = `${row.id}:${col.dateStr}`;
          const isOpen = openCell === cellKey;

          // Only render popover for bill rows with occurrences or pending cells
          if (row.type === "income") {
            return (
              <TrackerCell
                key={col.dateStr}
                occurrence={occurrence}
                dateStr={col.dateStr}
                rowId={row.id}
                onClick={() => {}}
              />
            );
          }

          const billOcc = occurrence as BillOccurrence | null;
          return (
            <TrackerCellPopover
              key={col.dateStr}
              open={isOpen}
              onClose={() => setOpenCell(null)}
              occurrence={billOcc}
              dateStr={col.dateStr}
              billId={entityId}
              trigger={
                <div className="contents">
                  <TrackerCell
                    occurrence={occurrence}
                    dateStr={col.dateStr}
                    rowId={row.id}
                    onClick={() => setOpenCell(isOpen ? null : cellKey)}
                  />
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
