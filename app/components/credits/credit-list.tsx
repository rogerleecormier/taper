"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { formatCurrency } from "~/lib/currency";
import { useDeleteCredit } from "~/hooks/use-credits";
import { CreditFormDialog } from "./credit-form-dialog";
import type { Credit } from "~/db/schema/credits";

type CreditWithRelations = Credit & {
  vendor: { id: string; name: string } | null;
  category: { id: string; name: string; color: string | null } | null;
};

interface CreditListProps {
  credits: CreditWithRelations[];
}

const INTERVAL_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  standalone: "Standalone",
};

const columnHelper = createColumnHelper<CreditWithRelations>();

export function CreditList({ credits }: CreditListProps) {
  const deleteCredit = useDeleteCredit();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this credit and all its occurrences?")) return;
    setDeletingId(id);
    try {
      await deleteCredit.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => (
        <Link
          to="/credits/$id"
          params={{ id: info.row.original.id }}
          className="font-medium hover:text-primary hover:underline underline-offset-4"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("vendor", {
      header: "Vendor",
      cell: (info) => {
        const vendor = info.getValue();
        return vendor ? (
          <span className="text-sm text-muted-foreground">{vendor.name}</span>
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
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
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
        <span className="tabular-nums font-medium text-accent">
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
          <Badge className="border-accent/20 bg-accent/10 text-accent">
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
        const credit = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <CreditFormDialog
              trigger={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
              }
              creditId={credit.id}
              defaultValues={{
                name: credit.name,
                vendorId: credit.vendorId,
                categoryId: credit.categoryId,
                amountCents: credit.amountCents,
                interval: credit.interval,
                startDate: credit.startDate,
                endDate: credit.endDate ?? null,
                dayOfMonth: credit.dayOfMonth ?? null,
                dayOfWeek: credit.dayOfWeek ?? null,
                notes: credit.notes ?? "",
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-danger hover:text-danger/80"
              onClick={() => handleDelete(credit.id)}
              disabled={deletingId === credit.id}
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
    data: credits,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="space-y-3 md:hidden">
        {credits.map((credit) => (
          <div key={credit.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/credits/$id"
                  params={{ id: credit.id }}
                  className="font-medium hover:text-primary hover:underline underline-offset-4 break-words"
                >
                  {credit.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground break-words">
                  {credit.vendor?.name ?? "No vendor"} · {credit.category?.name ?? "No category"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <CreditFormDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  }
                  creditId={credit.id}
                  defaultValues={{
                    name: credit.name,
                    vendorId: credit.vendorId,
                    categoryId: credit.categoryId,
                    amountCents: credit.amountCents,
                    interval: credit.interval,
                    startDate: credit.startDate,
                    endDate: credit.endDate ?? null,
                    dayOfMonth: credit.dayOfMonth ?? null,
                    dayOfWeek: credit.dayOfWeek ?? null,
                    notes: credit.notes ?? "",
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-danger hover:text-danger/80"
                  onClick={() => handleDelete(credit.id)}
                  disabled={deletingId === credit.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="tabular-nums font-medium text-accent">
                {formatCurrency(credit.amountCents)}
              </span>
              <span className="text-muted-foreground">
                {INTERVAL_LABELS[credit.interval] ?? credit.interval}
              </span>
              {credit.isActive ? (
                <Badge className="border-accent/20 bg-accent/10 text-accent">Active</Badge>
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
