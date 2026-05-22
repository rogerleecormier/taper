"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { formatCurrency } from "~/lib/currency";
import { useDeleteIncomeSource } from "~/hooks/use-income";
import { IncomeFormDialog } from "./income-form-dialog";
import type { IncomeSource } from "~/db/schema/income-sources";

type IncomeSourceWithRelations = IncomeSource & {
  vendor: { id: string; name: string } | null;
  category: { id: string; name: string; color: string | null } | null;
};

interface IncomeListProps {
  incomeSources: IncomeSourceWithRelations[];
}

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "One-time",
};

const columnHelper = createColumnHelper<IncomeSourceWithRelations>();

export function IncomeList({ incomeSources }: IncomeListProps) {
  const deleteIncomeSource = useDeleteIncomeSource();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this income source?")) return;
    setDeletingId(id);
    try {
      await deleteIncomeSource.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => {
        const src = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{info.getValue()}</span>
            {src.sourceType === "payroll" && (
              <Badge className="border-accent/20 bg-accent/10 text-accent text-xs">
                Payroll
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor("vendor", {
      header: "Source / Vendor",
      cell: (info) => {
        const v = info.getValue();
        return v ? (
          <span className="text-sm text-muted-foreground">{v.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => {
        const cat = info.getValue();
        if (!cat) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            {cat.color && (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            )}
            <span className="text-sm">{cat.name}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("amountCents", {
      header: "Amount",
      cell: (info) => (
        <span className="font-medium tabular-nums text-success">
          {formatCurrency(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("interval", {
      header: "Interval",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">
          {INTERVAL_LABELS[info.getValue()] ?? info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: (info) =>
        info.getValue() ? (
          <Badge className="border-success/20 bg-success/10 text-success">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const src = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <IncomeFormDialog
              trigger={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
              }
              incomeSourceId={src.id}
              defaultValues={{
                name: src.name,
                vendorId: src.vendorId,
                categoryId: src.categoryId,
                amountCents: src.amountCents,
                interval: src.interval,
                startDate: src.startDate,
                endDate: src.endDate ?? null,
                dayOfMonth: src.dayOfMonth ?? null,
                dayOfWeek: src.dayOfWeek ?? null,
                notes: src.notes ?? "",
              }}
            />
            {src.sourceType === "payroll" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/income/$id" params={{ id: src.id }}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-accent hover:text-accent/80">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="sr-only">View Pay Cycles</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>View pay cycles</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-danger hover:text-danger/80"
              onClick={() => handleDelete(src.id)}
              disabled={deletingId === src.id}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: incomeSources,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="space-y-3 md:hidden">
        {incomeSources.map((src) => (
          <div key={src.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">{src.name}</span>
                  {src.sourceType === "payroll" && (
                    <Badge className="border-accent/20 bg-accent/10 text-accent text-xs">
                      Payroll
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground break-words">
                  {src.vendor?.name ?? "No source"} · {src.category?.name ?? "No category"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <IncomeFormDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  }
                  incomeSourceId={src.id}
                  defaultValues={{
                    name: src.name,
                    vendorId: src.vendorId,
                    categoryId: src.categoryId,
                    amountCents: src.amountCents,
                    interval: src.interval,
                    startDate: src.startDate,
                    endDate: src.endDate ?? null,
                    dayOfMonth: src.dayOfMonth ?? null,
                    dayOfWeek: src.dayOfWeek ?? null,
                    notes: src.notes ?? "",
                  }}
                />
                {src.sourceType === "payroll" && (
                  <Link to="/income/$id" params={{ id: src.id }}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-accent hover:text-accent/80">
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="sr-only">View Pay Cycles</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-danger hover:text-danger/80"
                  onClick={() => handleDelete(src.id)}
                  disabled={deletingId === src.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium tabular-nums text-success">
                {formatCurrency(src.amountCents)}
              </span>
              <span className="text-muted-foreground">
                {INTERVAL_LABELS[src.interval] ?? src.interval}
              </span>
              {src.isActive ? (
                <Badge className="border-success/20 bg-success/10 text-success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden w-full overflow-x-auto rounded-md border md:block">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
