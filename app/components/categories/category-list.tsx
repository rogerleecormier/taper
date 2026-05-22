"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Pencil, Trash2, Plus, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useDeleteCategory } from "~/hooks/use-categories";
import { CategoryFormDialog } from "./category-form-dialog";
import type { Category } from "~/db/schema/categories";

interface CategoryListProps {
  categories: Category[];
}

const columnHelper = createColumnHelper<Category>();

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ChevronUp className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ChevronDown className="h-3.5 w-3.5" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

export function CategoryList({ categories }: CategoryListProps) {
  const deleteCategory = useDeleteCategory();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "type", desc: false },
  ]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Expenses and income sources using it will be uncategorized.")) return;
    setDeletingId(id);
    try {
      await deleteCategory.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      enableSorting: true,
      cell: (info) => {
        const cat = info.row.original;
        return (
          <div className="flex items-center gap-2.5">
            {cat.color ? (
              <span
                className="h-4 w-4 flex-shrink-0 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
            ) : (
              <span className="h-4 w-4 flex-shrink-0 rounded-full bg-muted" />
            )}
            {cat.icon && (
              <span className="text-base leading-none">{cat.icon}</span>
            )}
            <span className="font-medium">{info.getValue()}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("type", {
      header: "Type",
      enableSorting: true,
      cell: (info) => {
        const t = info.getValue();
        return t === "income" ? (
          <Badge className="border-success/20 bg-success/10 text-success">
            Income
          </Badge>
        ) : (
          <Badge className="border-danger/20 bg-danger/10 text-danger">
            Expense
          </Badge>
        );
      },
    }),
    columnHelper.accessor("color", {
      header: "Color",
      enableSorting: false,
      cell: (info) => {
        const color = info.getValue();
        return color ? (
          <span className="font-mono text-xs text-muted-foreground">{color}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const cat = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <CategoryFormDialog
              trigger={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
              }
              categoryId={cat.id}
              defaultValues={{
                name: cat.name,
                type: cat.type,
                color: cat.color ?? "#64748b",
                icon: cat.icon ?? "",
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-danger hover:text-danger/80"
              onClick={() => handleDelete(cat.id)}
              disabled={deletingId === cat.id}
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
    data: categories,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">No categories yet.</p>
        <CategoryFormDialog
          trigger={
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first category
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  {cat.color ? (
                    <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                  ) : (
                    <span className="h-4 w-4 flex-shrink-0 rounded-full bg-muted" />
                  )}
                  {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                  <span className="font-medium break-words">{cat.name}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {cat.type === "income" ? (
                    <Badge className="border-success/20 bg-success/10 text-success">Income</Badge>
                  ) : (
                    <Badge className="border-danger/20 bg-danger/10 text-danger">Expense</Badge>
                  )}
                  <span className="font-mono text-muted-foreground">{cat.color ?? "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <CategoryFormDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  }
                  categoryId={cat.id}
                  defaultValues={{
                    name: cat.name,
                    type: cat.type,
                    color: cat.color ?? "#64748b",
                    icon: cat.icon ?? "",
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-danger hover:text-danger/80"
                  onClick={() => handleDelete(cat.id)}
                  disabled={deletingId === cat.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden w-full overflow-x-auto rounded-md border md:block">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon sorted={sorted} />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
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
