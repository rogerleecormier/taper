"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { QuickAddVendorSelect, QuickAddCategorySelect } from "~/components/ui/quick-add-select";
import { toDateStr } from "~/lib/dates";
import { centsToDisplay, parseCurrencyToCents } from "~/lib/currency";

export type CreditFormData = {
  name: string;
  vendorId: string | null;
  categoryId: string | null;
  amountCents: number;
  interval: "daily" | "weekly" | "biweekly" | "monthly" | "standalone";
  startDate: string;
  endDate: string | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  notes: string;
  hidden?: boolean;
};

interface CreditFormProps {
  defaultValues?: Partial<CreditFormData>;
  onSubmit: (data: CreditFormData) => void;
  isLoading?: boolean;
  vendors: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const today = toDateStr(new Date());

export function CreditForm({
  defaultValues,
  onSubmit,
  isLoading,
  vendors,
  categories,
}: CreditFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [vendorId, setVendorId] = useState<string | null>(
    defaultValues?.vendorId ?? null
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    defaultValues?.categoryId ?? null
  );
  const [amountDisplay, setAmountDisplay] = useState(
    defaultValues?.amountCents != null
      ? centsToDisplay(defaultValues.amountCents)
      : ""
  );
  const [interval, setInterval] = useState<CreditFormData["interval"]>(
    defaultValues?.interval ?? "monthly"
  );
  const [startDate, setStartDate] = useState(defaultValues?.startDate ?? today);
  const [endDate, setEndDate] = useState(defaultValues?.endDate ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(
    defaultValues?.dayOfMonth != null ? String(defaultValues.dayOfMonth) : ""
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    defaultValues?.dayOfWeek != null ? String(defaultValues.dayOfWeek) : ""
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [hidden, setHidden] = useState(defaultValues?.hidden ?? false);
  const [error, setError] = useState<string | null>(null);

  const showDayOfMonth = interval === "monthly";
  const showDayOfWeek = interval === "weekly" || interval === "biweekly";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountCents = parseCurrencyToCents(amountDisplay);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (amountCents <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    onSubmit({
      name: name.trim(),
      vendorId: vendorId || null,
      categoryId: categoryId || null,
      amountCents,
      interval,
      startDate,
      endDate: endDate || null,
      dayOfMonth: showDayOfMonth && dayOfMonth ? parseInt(dayOfMonth, 10) : null,
      dayOfWeek: showDayOfWeek && dayOfWeek !== "" ? parseInt(dayOfWeek, 10) : null,
      notes,
      hidden,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="credit-name">Name *</Label>
        <Input
          id="credit-name"
          type="text"
          placeholder="e.g. Insurance Reimbursement"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="credit-amount">Amount *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="credit-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className="pl-7"
            value={amountDisplay}
            onChange={(e) => setAmountDisplay(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Interval */}
      <div className="space-y-1.5">
        <Label>Interval *</Label>
        <Select
          value={interval}
          onValueChange={(v) => setInterval(v as CreditFormData["interval"])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Biweekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="standalone">Standalone (one-time)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day of month — monthly only */}
      {showDayOfMonth && (
        <div className="space-y-1.5">
          <Label htmlFor="credit-day-of-month">Day of Month (1–31)</Label>
          <Input
            id="credit-day-of-month"
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 15"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        </div>
      )}

      {/* Day of week — weekly / biweekly */}
      {showDayOfWeek && (
        <div className="space-y-1.5">
          <Label>Day of Week</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OF_WEEK_LABELS.map((label, i) => (
                <SelectItem key={i} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Start / End date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="credit-start-date">Start Date *</Label>
          <Input
            id="credit-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="credit-end-date">End Date (optional)</Label>
          <Input
            id="credit-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Vendor */}
      <QuickAddVendorSelect
        value={vendorId}
        onChange={setVendorId}
        vendors={vendors}
      />

      {/* Category */}
      <QuickAddCategorySelect
        value={categoryId}
        onChange={setCategoryId}
        categories={categories}
        categoryType="income"
      />

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="credit-notes">Notes (optional)</Label>
        <textarea
          id="credit-notes"
          rows={3}
          placeholder="Any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Hidden */}
      <div className="flex items-center gap-2">
        <input
          id="credit-hidden"
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
          className="rounded border border-input"
        />
        <Label htmlFor="credit-hidden" className="cursor-pointer">
          Hide this credit
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Credit"}
      </Button>
    </form>
  );
}
