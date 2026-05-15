"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
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
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
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
        <span className="font-medium tabular-nums text-green-700">
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
          <Badge className="border-green-200 bg-green-100 text-green-800">
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
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

  if (incomeSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">No income sources yet.</p>
        <IncomeFormDialog
          trigger={
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first income source
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border">
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
  );
}
