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
import { toDateStr } from "~/lib/dates";
import { centsToDisplay, parseCurrencyToCents } from "~/lib/currency";

export type IncomeFormData = {
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
};

interface IncomeFormProps {
  defaultValues?: Partial<IncomeFormData>;
  onSubmit: (data: IncomeFormData) => void;
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

export function IncomeForm({
  defaultValues,
  onSubmit,
  isLoading,
  vendors,
  categories,
}: IncomeFormProps) {
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
  const [interval, setInterval] = useState<IncomeFormData["interval"]>(
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
      dayOfWeek:
        showDayOfWeek && dayOfWeek !== "" ? parseInt(dayOfWeek, 10) : null,
      notes,
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
        <Label htmlFor="income-name">Name *</Label>
        <Input
          id="income-name"
          type="text"
          placeholder="e.g. Salary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="income-amount">Amount *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="income-amount"
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
          onValueChange={(v) => setInterval(v as IncomeFormData["interval"])}
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

      {/* Day of month */}
      {showDayOfMonth && (
        <div className="space-y-1.5">
          <Label htmlFor="income-day-of-month">Day of Month (1–31)</Label>
          <Input
            id="income-day-of-month"
            type="number"
            min="1"
            max="31"
            placeholder="e.g. 1"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        </div>
      )}

      {/* Day of week */}
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
          <Label htmlFor="income-start-date">Start Date *</Label>
          <Input
            id="income-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="income-end-date">End Date (optional)</Label>
          <Input
            id="income-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Vendor */}
      <div className="space-y-1.5">
        <Label>Source / Vendor (optional)</Label>
        <Select
          value={vendorId ?? "__none__"}
          onValueChange={(v) => setVendorId(v === "__none__" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="No vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No vendor</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category (optional)</Label>
        <Select
          value={categoryId ?? "__none__"}
          onValueChange={(v) => setCategoryId(v === "__none__" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="No category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="income-notes">Notes (optional)</Label>
        <textarea
          id="income-notes"
          rows={3}
          placeholder="Any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Income Source"}
      </Button>
    </form>
  );
}
