"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Wallet, Receipt, ChevronUp, BadgeDollarSign } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatCurrency } from "~/lib/currency";
import { Button } from "~/components/ui/button";
import { TrackerOccurrenceRow } from "./tracker-occurrence-row";
import type { BillOccurrence } from "~/db/schema/bill-occurrences";
import type { BillPayment } from "~/db/schema/bill-payments";
import type { IncomeOccurrence } from "~/db/schema/income-occurrences";
import type { CreditOccurrence } from "~/db/schema/credit-occurrences";
import type { CreditReceipt } from "~/db/schema/credit-receipts";

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "One-time",
};

const DEFAULT_VISIBLE = 3;

interface TrackerParentRowProps {
  id: string;
  type: "income" | "bill" | "credit";
  name: string;
  interval: string;
  defaultAmountCents: number;
  periodTotal: number;
  categoryName: string | null;
  categoryColor: string | null;
  vendorName: string | null;
  occurrences: BillOccurrence[] | IncomeOccurrence[] | CreditOccurrence[];
  paymentsByOccurrenceId?: Map<string, BillPayment[]>;
  receiptsByOccurrenceId?: Map<string, CreditReceipt[]>;
}

export function TrackerParentRow({
  id,
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
  receiptsByOccurrenceId,
}: TrackerParentRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [showCount, setShowCount] = useState(DEFAULT_VISIBLE);
  const isIncome = type === "income";
  const isCredit = type === "credit";

  const Icon = isIncome ? Wallet : isCredit ? BadgeDollarSign : Receipt;
  const displayTotal = periodTotal > 0 ? periodTotal : defaultAmountCents;

  const meta = [vendorName, categoryName].filter(Boolean).join(" · ");
  const entityId = id.split(":")[1];

  const visibleOccs = (occurrences as (BillOccurrence | IncomeOccurrence)[]).slice(0, showCount);
  const hiddenCount = occurrences.length - showCount;

  return (
    <div className="border-b bg-background">
      {/* Parent header row */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", isIncome ? "text-green-500" : isCredit ? "text-teal-500" : "text-red-400")} />

        {categoryColor && (
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
        )}

        <div className="min-w-0 flex-1 basis-[45%] sm:basis-auto">
          <span className="font-medium text-sm break-words">{name}</span>
          {meta && (
            <span className="ml-2 text-xs text-muted-foreground break-words">{meta}</span>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()} className="order-2 sm:order-none">
          {isIncome ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" asChild>
              <Link to="/income/$id" params={{ id: entityId }}>
                Edit Series
              </Link>
            </Button>
          ) : isCredit ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" asChild>
              <Link to="/credits">
                Edit Series
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" asChild>
              <Link to="/bills">
                Edit Series
              </Link>
            </Button>
          )}
        </div>

        <span className="order-3 sm:order-none flex-shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
          {INTERVAL_LABELS[interval] ?? interval}
        </span>

        <span className={cn("order-4 sm:order-none flex-shrink-0 tabular-nums text-sm font-semibold", isIncome ? "text-green-600" : isCredit ? "text-teal-600" : "text-red-600")}>
          {formatCurrency(displayTotal)}
        </span>

        {occurrences.length > 0 && (
          <span className="order-5 sm:order-none flex-shrink-0 rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-500">
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
            <>
              {visibleOccs.map((occ) => (
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
                  receipts={
                    type === "credit" && receiptsByOccurrenceId
                      ? (receiptsByOccurrenceId.get(occ.id) ?? [])
                      : []
                  }
                />
              ))}

              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowCount((n) => n + occurrences.length)}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                  Show {hiddenCount} more
                </button>
              )}

              {occurrences.length > DEFAULT_VISIBLE && hiddenCount === 0 && (
                <button
                  onClick={() => setShowCount(DEFAULT_VISIBLE)}
                  className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
