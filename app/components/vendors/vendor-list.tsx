"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useDeleteVendor } from "~/hooks/use-vendors";
import { VendorFormDialog } from "./vendor-form-dialog";
import type { Vendor } from "~/db/schema/vendors";

interface VendorListProps {
  vendors: Vendor[];
}

const columnHelper = createColumnHelper<Vendor>();

export function VendorList({ vendors }: VendorListProps) {
  const deleteVendor = useDeleteVendor();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor?")) return;
    setDeletingId(id);
    try {
      await deleteVendor.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("website", {
      header: "Website",
      cell: (info) => {
        const url = info.getValue();
        if (!url) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            {url.replace(/^https?:\/\//, "").split("/")[0]}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
      cell: (info) => {
        const phone = info.getValue();
        return phone ? (
          <span className="text-sm">{phone}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor("notes", {
      header: "Notes",
      cell: (info) => {
        const notes = info.getValue();
        return notes ? (
          <span className="max-w-xs truncate text-sm text-muted-foreground">
            {notes}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const vendor = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <VendorFormDialog
              trigger={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
              }
              vendorId={vendor.id}
              defaultValues={{
                name: vendor.name,
                website: vendor.website ?? "",
                phone: vendor.phone ?? "",
                notes: vendor.notes ?? "",
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              onClick={() => handleDelete(vendor.id)}
              disabled={deletingId === vendor.id}
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
    data: vendors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">No vendors yet.</p>
        <VendorFormDialog
          trigger={
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first vendor
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium break-words">{vendor.name}</p>
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <p className="break-all">
                    {vendor.website ? (
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        {vendor.website.replace(/^https?:\/\//, "").split("/")[0]}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "No website"}
                  </p>
                  <p>{vendor.phone ?? "No phone"}</p>
                  <p className="break-words">{vendor.notes ?? "No notes"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <VendorFormDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  }
                  vendorId={vendor.id}
                  defaultValues={{
                    name: vendor.name,
                    website: vendor.website ?? "",
                    phone: vendor.phone ?? "",
                    notes: vendor.notes ?? "",
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(vendor.id)}
                  disabled={deletingId === vendor.id}
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
