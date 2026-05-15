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
import { useDeleteCategory } from "~/hooks/use-categories";
import { CategoryFormDialog } from "./category-form-dialog";
import type { Category } from "~/db/schema/categories";

interface CategoryListProps {
  categories: Category[];
}

const columnHelper = createColumnHelper<Category>();

export function CategoryList({ categories }: CategoryListProps) {
  const deleteCategory = useDeleteCategory();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Bills and income sources using it will be uncategorized.")) return;
    setDeletingId(id);
    try {
      await deleteCategory.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    columnHelper.display({
      id: "color-name",
      header: "Name",
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
              <span className="h-4 w-4 flex-shrink-0 rounded-full bg-gray-200" />
            )}
            {cat.icon && (
              <span className="text-base leading-none">{cat.icon}</span>
            )}
            <span className="font-medium">{cat.name}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: (info) => {
        const t = info.getValue();
        return t === "income" ? (
          <Badge className="border-green-200 bg-green-100 text-green-800">
            Income
          </Badge>
        ) : (
          <Badge className="border-red-200 bg-red-100 text-red-800">
            Expense
          </Badge>
        );
      },
    }),
    columnHelper.accessor("color", {
      header: "Color",
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
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
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
    getCoreRowModel: getCoreRowModel(),
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
