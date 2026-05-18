"use client";

import { useState } from "react";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useCreateVendor } from "~/hooks/use-vendors";
import { useCreateCategory } from "~/hooks/use-categories";

// ─── Vendor ──────────────────────────────────────────────────────────────────

interface QuickAddVendorSelectProps {
  label?: string;
  value: string | null;
  onChange: (id: string | null) => void;
  vendors: Array<{ id: string; name: string }>;
}

export function QuickAddVendorSelect({
  label = "Vendor (optional)",
  value,
  onChange,
  vendors,
}: QuickAddVendorSelectProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [localItems, setLocalItems] = useState<Array<{ id: string; name: string }>>([]);
  const createVendor = useCreateVendor();

  const allVendors = [
    ...vendors,
    ...localItems.filter((l) => !vendors.some((v) => v.id === l.id)),
  ];

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const result = await createVendor.mutateAsync({ name, website: "" });
    const created = { id: result.id, name };
    setLocalItems((prev) => [...prev, created]);
    onChange(result.id);
    setNewName("");
    setShowAdd(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      setShowAdd(false);
      setNewName("");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>

      <Select
        value={value ?? "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="No vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No vendor</SelectItem>
          {allVendors.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showAdd && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Vendor name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            disabled={!newName.trim() || createVendor.isPending}
            onClick={handleCreate}
          >
            {createVendor.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={() => { setShowAdd(false); setNewName(""); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Category ─────────────────────────────────────────────────────────────────

interface QuickAddCategorySelectProps {
  label?: string;
  value: string | null;
  onChange: (id: string | null) => void;
  categories: Array<{ id: string; name: string }>;
  categoryType: "expense" | "income";
}

export function QuickAddCategorySelect({
  label = "Category (optional)",
  value,
  onChange,
  categories,
  categoryType,
}: QuickAddCategorySelectProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [localItems, setLocalItems] = useState<Array<{ id: string; name: string }>>([]);
  const createCategory = useCreateCategory();

  const allCategories = [
    ...categories,
    ...localItems.filter((l) => !categories.some((c) => c.id === l.id)),
  ];

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const result = await createCategory.mutateAsync({
      name,
      type: categoryType,
      color: "#94a3b8",
      sortOrder: 999,
    });
    const created = { id: result.id, name };
    setLocalItems((prev) => [...prev, created]);
    onChange(result.id);
    setNewName("");
    setShowAdd(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      setShowAdd(false);
      setNewName("");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      </div>

      <Select
        value={value ?? "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="No category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No category</SelectItem>
          {allCategories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showAdd && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            disabled={!newName.trim() || createCategory.isPending}
            onClick={handleCreate}
          >
            {createCategory.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={() => { setShowAdd(false); setNewName(""); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
