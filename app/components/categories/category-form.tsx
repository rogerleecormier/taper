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
import { cn } from "~/lib/utils";

export type CategoryFormData = {
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string;
};

interface CategoryFormProps {
  defaultValues?: Partial<CategoryFormData>;
  onSubmit: (data: CategoryFormData) => void;
  isLoading?: boolean;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
  "#78716c", // stone
  "#000000", // black
];

export function CategoryForm({
  defaultValues,
  onSubmit,
  isLoading,
}: CategoryFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [type, setType] = useState<"expense" | "income">(
    defaultValues?.type ?? "expense"
  );
  const [color, setColor] = useState(defaultValues?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(defaultValues?.icon ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    onSubmit({ name: name.trim(), type, color, icon });
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
        <Label htmlFor="cat-name">Name *</Label>
        <Input
          id="cat-name"
          type="text"
          placeholder="e.g. Housing"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label>Type *</Label>
        <Select
          value={type}
          onValueChange={(v) => setType(v as "expense" | "income")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Color</Label>
        {/* Preset swatches */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                color === preset
                  ? "border-foreground scale-110"
                  : "border-transparent"
              )}
              style={{ backgroundColor: preset }}
              aria-label={`Select color ${preset}`}
            />
          ))}
        </div>
        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-input"
            aria-label="Custom color picker"
          />
          <span className="text-xs text-muted-foreground">
            Custom: {color}
          </span>
        </div>
      </div>

      {/* Icon (optional text/emoji) */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-icon">Icon (optional)</Label>
        <Input
          id="cat-icon"
          type="text"
          placeholder="e.g. 🏠 or home"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={10}
        />
        <p className="text-xs text-muted-foreground">
          Enter an emoji or short text label for the category icon.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Category"}
      </Button>
    </form>
  );
}
