import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { useVendors } from "~/hooks/use-vendors";
import { VendorList } from "~/components/vendors/vendor-list";
import { VendorFormDialog } from "~/components/vendors/vendor-form-dialog";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/vendors/")({
  component: VendorsPage,
  head: () => ({
    meta: [
      {
        title: "Vendors - Taper",
      },
      {
        name: "description",
        content: "Manage the vendors associated with your expenses",
      },
    ],
  }),
});

function VendorsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: vendors, isLoading, isError } = useVendors();

  return (
    <div className="entity-page">
      <div className="entity-header">
        <div>
          <h1 className="entity-title">Vendors</h1>
          <p className="entity-subtitle">
            Manage the vendors associated with your expenses
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 sm:self-center">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/30 bg-danger/5 py-16 text-center">
          <p className="text-sm text-danger font-medium">Failed to load vendors.</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh the page and try again.</p>
        </div>
      )}

      {!isLoading && !isError && vendors?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1 font-heading text-foreground">No vendors yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Add vendors like your landlord, utility company, or streaming services to organize your expenses.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add your first vendor
          </Button>
        </div>
      )}

      {!isLoading && !isError && vendors && vendors.length > 0 && (
        <VendorList vendors={vendors} />
      )}

      <VendorFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
