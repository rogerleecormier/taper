"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "~/lib/currency";
import { getTrendData, type TrendPeriod } from "~/server/fn/dashboard";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const PERIODS: { label: string; value: TrendPeriod }[] = [
  { label: "1M", value: 1 },
  { label: "3M", value: 3 },
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
];

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function yAxisTickFormatter(value: number): string {
  if (value === 0) return "$0";
  if (value >= 100_000) return `$${(value / 100_000).toFixed(0)}k`;
  return `$${(value / 100).toFixed(0)}`;
}

export function IncomeExpenseChart() {
  const [period, setPeriod] = useState<TrendPeriod>(1);

  const { data: trend, isLoading } = useQuery({
    queryKey: ["trend", period],
    queryFn: () => getTrendData({ data: { months: period } }),
    staleTime: 60_000,
  });

  const hasData = trend && trend.some((d) => d.incomeCents > 0 || d.expensesCents > 0);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Income vs Expenses
        </h3>
        <div className="flex gap-1">
          {PERIODS.map(({ label, value }) => (
            <Button
              key={value}
              size="sm"
              variant={period === value ? "default" : "ghost"}
              className={cn("h-7 px-2.5 text-xs", period !== value && "text-muted-foreground")}
              onClick={() => setPeriod(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[280px]">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center h-[280px] gap-1">
          <p className="text-sm text-muted-foreground">No data for this period</p>
          <p className="text-xs text-muted-foreground">Mark bills as paid or income as received to see trends</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={trend}
            margin={{ top: 4, right: 4, left: 8, bottom: 4 }}
            barCategoryGap="25%"
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={yAxisTickFormatter}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }} />
            <Bar
              dataKey="incomeCents"
              name="Income"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expensesCents"
              name="Expenses"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
