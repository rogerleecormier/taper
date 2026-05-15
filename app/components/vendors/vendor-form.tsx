"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export type VendorFormData = {
  name: string;
  website: string;
  phone: string;
  notes: string;
};

interface VendorFormProps {
  defaultValues?: Partial<VendorFormData>;
  onSubmit: (data: VendorFormData) => void;
  isLoading?: boolean;
}

export function VendorForm({ defaultValues, onSubmit, isLoading }: VendorFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [website, setWebsite] = useState(defaultValues?.website ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Vendor name is required.");
      return;
    }
    onSubmit({ name: name.trim(), website, phone, notes });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="vendor-name">Name *</Label>
        <Input
          id="vendor-name"
          type="text"
          placeholder="e.g. Netflix"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor-website">Website (optional)</Label>
        <Input
          id="vendor-website"
          type="url"
          placeholder="https://example.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor-phone">Phone (optional)</Label>
        <Input
          id="vendor-phone"
          type="tel"
          placeholder="(555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="vendor-notes">Notes (optional)</Label>
        <textarea
          id="vendor-notes"
          rows={3}
          placeholder="Any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Vendor"}
      </Button>
    </form>
  );
}
