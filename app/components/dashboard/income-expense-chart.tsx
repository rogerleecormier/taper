"use client";

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
import type { DashboardData } from "~/server/fn/dashboard";

interface IncomeExpenseChartProps {
  monthlyTrend: DashboardData["monthlyTrend"];
}

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

export function IncomeExpenseChart({ monthlyTrend }: IncomeExpenseChartProps) {
  // Recharts expects raw numbers — keep cents but format display
  return (
    <div className="w-full">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Income vs Expenses (Last 6 Months)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={monthlyTrend}
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
          <Legend
            wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
          />
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
    </div>
  );
}
