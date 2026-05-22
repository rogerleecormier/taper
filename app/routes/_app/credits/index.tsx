import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, BadgeDollarSign } from "lucide-react";
import { useCredits } from "~/hooks/use-credits";
import { CreditList } from "~/components/credits/credit-list";
import { CreditFormDialog } from "~/components/credits/credit-form-dialog";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_app/credits/")({
  component: CreditsPage,
});

function CreditsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showStandaloneCredits, setShowStandaloneCredits] = useState(false);
  const { data: credits, isLoading, isError } = useCredits();
  const visibleCredits = (credits ?? []).filter((credit) =>
    showStandaloneCredits ? true : credit.interval !== "standalone"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Credits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage amounts vendors owe back to you
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Credit
        </Button>
      </div>
      <label className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showStandaloneCredits}
          onChange={(e) => setShowStandaloneCredits(e.target.checked)}
          className="h-4 w-4 rounded border-input bg-card text-primary focus:ring-primary focus:ring-offset-background"
        />
        Show standalone credits
      </label>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/30 bg-danger/5 py-16 text-center">
          <p className="text-sm text-danger font-medium">Failed to load credits.</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh the page and try again.</p>
        </div>
      )}

      {!isLoading && !isError && credits?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="rounded-full bg-accent/10 border border-accent/20 p-4 mb-4">
            <BadgeDollarSign className="h-8 w-8 text-accent" />
          </div>
          <h3 className="font-semibold text-base mb-1 font-heading text-foreground">No credits yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Add credits to track amounts vendors owe back to you — like insurance reimbursements or partial refunds.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add your first credit
          </Button>
        </div>
      )}

      {!isLoading && !isError && credits && credits.length > 0 && visibleCredits.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No recurring credits in this view.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Turn on &quot;Show standalone credits&quot; to include one-time items.
          </p>
        </div>
      )}

      {!isLoading && !isError && visibleCredits.length > 0 && (
        <CreditList credits={visibleCredits} />
      )}

      <CreditFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
