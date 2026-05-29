"use client";

import { Calendar } from "lucide-react";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";

interface GoalTransferTimelineRowProps {
  transfer: any;
  name: string;
}

export function GoalTransferTimelineRow({ transfer, name }: GoalTransferTimelineRowProps) {
  const isAllocation = !transfer.fromGoalId && transfer.toGoalId;
  const amount = transfer.amountCents;
  const dateStr = transfer.transferDate;

  const colorStyle = isAllocation
    ? "border-warning/15 bg-warning/5 text-warning"
    : "border-success/15 bg-success/5 text-success";

  const indicatorStyle = isAllocation ? "bg-warning" : "bg-success";

  return (
    <div className="relative pl-6 pb-6 last:pb-0 group/timeline-item">
      {/* Vertical timeline connector */}
      <div className="absolute left-[7px] top-2 bottom-0 w-[2px] bg-border/55 group-last/timeline-item:hidden" />

      {/* Timeline bullet */}
      <div className={cn(
        "absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center transition-all",
        indicatorStyle
      )}>
        <div className="h-1.5 w-1.5 rounded-full bg-background" />
      </div>

      {/* Card */}
      <div className={cn(
        "rounded-2xl border bg-card p-4 transition-all shadow-xs duration-200 hover:shadow-md hover:border-primary/20",
        colorStyle
      )}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-foreground tracking-tight">{name}</span>
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-muted-foreground">
                Goal Transfer
              </span>
            </div>
            {transfer.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{transfer.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase", colorStyle)}>
              Completed
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-border/40 my-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <Calendar className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <span className="font-semibold">{dateStr}</span>
            </div>
            <div className="flex flex-col">
              <span className={cn("text-lg font-black tabular-nums tracking-tight leading-none", isAllocation ? "text-warning" : "text-success")}>
                {isAllocation ? `-${formatCurrency(amount)}` : formatCurrency(amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
