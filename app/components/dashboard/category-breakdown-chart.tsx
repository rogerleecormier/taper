"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "~/lib/currency";
import type { DashboardData } from "~/server/fn/dashboard";

interface CategoryBreakdownChartProps {
  categoryBreakdown: DashboardData["categoryBreakdown"];
}

const FALLBACK_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string | null; percentage: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold">{entry.name}</p>
      <p className="text-sm tabular-nums">{formatCurrency(entry.value)}</p>
      <p className="text-xs text-muted-foreground">{entry.payload.percentage}%</p>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string }>;
  categoryBreakdown: DashboardData["categoryBreakdown"];
}

function CustomLegend({ categoryBreakdown }: CustomLegendProps) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {categoryBreakdown.map((cat, i) => (
        <div key={cat.categoryId ?? i} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
          />
          <span className="text-xs text-muted-foreground">{cat.categoryName}</span>
          <span className="text-xs font-medium tabular-nums">
            {formatCurrency(cat.totalCents)}
          </span>
          <span className="text-xs text-muted-foreground">({cat.percentage}%)</span>
        </div>
      ))}
    </div>
  );
}

export function CategoryBreakdownChart({ categoryBreakdown }: CategoryBreakdownChartProps) {
  if (categoryBreakdown.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <p className="text-sm">No expense categories to display</p>
      </div>
    );
  }

  const chartData = categoryBreakdown.map((cat, i) => ({
    name: cat.categoryName,
    value: cat.totalCents,
    color: cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    percentage: cat.percentage,
  }));

  return (
    <div className="w-full">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Expense Breakdown by Category
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend categoryBreakdown={categoryBreakdown} />
    </div>
  );
}
