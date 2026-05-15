import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useVendors } from "~/hooks/use-vendors";
import { VendorList } from "~/components/vendors/vendor-list";
import { VendorFormDialog } from "~/components/vendors/vendor-form-dialog";

export const Route = createFileRoute("/_app/vendors/")({
  component: VendorsPage,
});

function VendorsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: vendors, isLoading, isError } = useVendors();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the vendors associated with your bills
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}

      {isError && (
        <p className="text-sm text-red-500">
          Failed to load vendors. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <VendorList vendors={vendors ?? []} />
      )}

      <VendorFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
