import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO, subMonths, addMonths } from "date-fns";
import {
  CreditCard,
  ArrowRight,
  Clock,
  LayoutList,
  BookOpen,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import {
  useScheduledPaymentsForPage,
  usePaidPaymentsForPage,
} from "~/hooks/use-occurrences";
import {
  OccurrenceDetailModal,
  type OccurrenceModalItem,
} from "~/components/tracker/occurrence-detail-modal";
import {
  PaymentEditModal,
  type PaymentEditItem,
} from "~/components/payments/payment-edit-modal";
import { formatCurrency } from "~/lib/currency";
import { toDateStr } from "~/lib/dates";
import { cn } from "~/lib/utils";
import type { OccurrenceStatus } from "~/db/schema/bill-occurrences";

export const Route = createFileRoute("/_app/payments/")({
  component: PaymentsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduledRow = {
  occurrenceId: string;
  billId: string;
  dueDate: string;
  amountCents: number;
  paidAmountCents: number | null;
  status: OccurrenceStatus;
  notes: string | null;
  carriedFromId: string | null;
  originalDueDate: string | null;
  billName: string;
  billInterval: string;
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  hidden: boolean;
};

type PaidRow = {
  paymentId: string;
  paymentAmountCents: number;
  paidDate: string;
  paymentNotes: string | null;
  occurrenceId: string;
  occurrenceDueDate: string;
  occurrenceAmountCents: number;
  occurrencePaidAmountCents: number | null;
  occurrenceStatus: OccurrenceStatus;
  billId: string;
  billName: string;
  billInterval: string;
  vendorId: string | null;
  vendorName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OccurrenceStatus, { label: string; className: string }> = {
  pending: { label: "Pending",  className: "border-border bg-muted/50 text-muted-foreground" },
  overdue: { label: "Overdue",  className: "border-danger/20 bg-danger/10 text-danger" },
  partial: { label: "Partial",  className: "border-warning/20 bg-warning/10 text-warning" },
  paid:    { label: "Paid",     className: "border-success/20 bg-success/10 text-success" },
  skipped: { label: "Skipped",  className: "border-border bg-muted/50 text-muted-foreground" },
  carried: { label: "Carried",  className: "border-accent/20 bg-accent/10 text-accent" },
};

const RANGE_OPTIONS = [
  { months: 1,  label: "1 Mo" },
  { months: 3,  label: "3 Mo" },
  { months: 6,  label: "6 Mo" },
  { months: 12, label: "12 Mo" },
] as const;

// Statuses shown in upcoming by default (skipped excluded)
const DEFAULT_STATUSES = new Set<OccurrenceStatus>(["overdue", "pending", "partial", "carried"]);

// ─── Root page ────────────────────────────────────────────────────────────────

function PaymentsPage() {
  const [showPaid, setShowPaid] = useState(false);
  const [rangeMonths, setRangeMonths] = useState<1 | 3 | 6 | 12>(3);
  // Status multi-select: which statuses to show in upcoming
  const [statusFilter, setStatusFilter] = useState<Set<OccurrenceStatus>>(new Set(DEFAULT_STATUSES));
  // Carried-only toggle (sub-filter of upcoming)
  const [carriedOnly, setCarriedOnly] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [occurrenceModal, setOccurrenceModal] = useState<OccurrenceModalItem | null>(null);
  const [paymentEditModal, setPaymentEditModal] = useState<PaymentEditItem | null>(null);

  const today = toDateStr(new Date());
  const rangeEnd = toDateStr(addMonths(new Date(), rangeMonths));
  const rangeStart = toDateStr(subMonths(new Date(), rangeMonths));

  const { data: scheduled = [], isLoading: scheduledLoading, isError: scheduledError } =
    useScheduledPaymentsForPage({ endDate: rangeEnd });

  const { data: paidPayments = [], isLoading: paidLoading, isError: paidError } =
    usePaidPaymentsForPage({ startDate: rangeStart, endDate: today });

  // Build vendor and category option lists from all data
  const vendors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of scheduled) {
      if (r.vendorId && r.vendorName) seen.set(r.vendorId, r.vendorName);
    }
    for (const r of paidPayments) {
      if (r.vendorId && r.vendorName) seen.set(r.vendorId, r.vendorName);
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scheduled, paidPayments]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>(); // name → color
    for (const r of scheduled) {
      if (r.categoryName) seen.set(r.categoryName, r.categoryColor ?? "#94a3b8");
    }
    for (const r of paidPayments) {
      if (r.categoryName) seen.set(r.categoryName, r.categoryColor ?? "#94a3b8");
    }
    return Array.from(seen.entries())
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scheduled, paidPayments]);

  // Status counts across ALL scheduled rows (pre-filter) so chips show real counts
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<OccurrenceStatus, number>> = {};
    for (const r of scheduled) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    // "carried" is a sub-type of pending/overdue rows, track separately
    counts["carried"] = counts["carried"] ?? 0;
    return counts;
  }, [scheduled]);

  const filteredScheduled = useMemo(() => {
    return scheduled.filter((r) => {
      if (!statusFilter.has(r.status)) return false;
      if (carriedOnly && !r.carriedFromId) return false;
      if (vendorFilter !== "all") {
        if (vendorFilter === "__none__" && r.vendorId) return false;
        if (vendorFilter !== "__none__" && r.vendorId !== vendorFilter) return false;
      }
      if (categoryFilter !== "all") {
        if (categoryFilter === "__none__" && r.categoryName) return false;
        if (categoryFilter !== "__none__" && r.categoryName !== categoryFilter) return false;
      }
      return true;
    });
  }, [scheduled, statusFilter, carriedOnly, vendorFilter, categoryFilter]);

  const filteredPaid = useMemo(() => {
    return paidPayments.filter((r) => {
      if (vendorFilter !== "all") {
        if (vendorFilter === "__none__" && r.vendorId) return false;
        if (vendorFilter !== "__none__" && r.vendorId !== vendorFilter) return false;
      }
      if (categoryFilter !== "all") {
        if (categoryFilter === "__none__" && r.categoryName) return false;
        if (categoryFilter !== "__none__" && r.categoryName !== categoryFilter) return false;
      }
      return true;
    });
  }, [paidPayments, vendorFilter, categoryFilter]);

  function toggleStatus(s: OccurrenceStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  const hasActiveFilters =
    statusFilter.size !== DEFAULT_STATUSES.size ||
    [...statusFilter].some((s) => !DEFAULT_STATUSES.has(s)) ||
    carriedOnly ||
    vendorFilter !== "all" ||
    categoryFilter !== "all";

  function resetFilters() {
    setStatusFilter(new Set(DEFAULT_STATUSES));
    setCarriedOnly(false);
    setVendorFilter("all");
    setCategoryFilter("all");
  }

  const isLoading = scheduledLoading || (showPaid && paidLoading);
  const isError = scheduledError || (showPaid && paidError);

  function openOccurrenceModal(row: ScheduledRow) {
    setOccurrenceModal({
      occurrenceId: row.occurrenceId,
      billId: row.billId,
      billName: row.billName,
      billInterval: row.billInterval,
      dueDate: row.dueDate,
      amountCents: row.amountCents,
      paidAmountCents: row.paidAmountCents,
      status: row.status,
      notes: row.notes,
      carriedFromId: row.carriedFromId,
      vendorName: row.vendorName,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      originalDueDate: row.originalDueDate,
      hidden: row.hidden,
    });
  }

  function openPaymentEditModal(row: PaidRow) {
    setPaymentEditModal({
      paymentId: row.paymentId,
      occurrenceId: row.occurrenceId,
      amountCents: row.paymentAmountCents,
      paidDate: row.paidDate,
      notes: row.paymentNotes,
      billName: row.billName,
      occurrenceDueDate: row.occurrenceDueDate,
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming scheduled payments and recorded payment history.
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        {/* Row 1: Status chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16 flex-shrink-0">
            Status
          </span>
          {(["overdue", "pending", "partial", "paid", "carried"] as OccurrenceStatus[]).map((s) => {
            const active = statusFilter.has(s);
            const count = statusCounts[s] ?? 0;
            const styles: Record<string, string> = {
              overdue:  active ? "border-danger/40 bg-danger/10 text-danger"       : "border-border text-muted-foreground hover:border-danger/30 hover:text-danger",
              pending:  active ? "border-border bg-muted text-foreground"           : "border-border text-muted-foreground hover:bg-muted/50",
              partial:  active ? "border-warning/40 bg-warning/10 text-warning"    : "border-border text-muted-foreground hover:border-warning/30 hover:text-warning",
              paid:     active ? "border-success/40 bg-success/10 text-success"    : "border-border text-muted-foreground hover:border-success/30 hover:text-success",
              carried:  active ? "border-accent/40 bg-accent/10 text-accent"       : "border-border text-muted-foreground hover:border-accent/30 hover:text-accent",
            };
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  styles[s]
                )}
              >
                {STATUS_STYLES[s].label}
                {count > 0 && (
                  <span className="tabular-nums opacity-70">{count}</span>
                )}
              </button>
            );
          })}

          {/* Carried sub-filter */}
          <button
            onClick={() => setCarriedOnly((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              carriedOnly
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-border text-muted-foreground hover:border-warning/30 hover:text-warning"
            )}
          >
            <Clock className="h-3 w-3" />
            Carried only
          </button>
        </div>

        {/* Row 2: Dropdowns + history toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16 flex-shrink-0">
            Filter
          </span>

          {vendors.length > 0 && (
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
              <option value="__none__">No vendor</option>
            </select>
          )}

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-input bg-card px-3 py-1.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
              <option value="__none__">No category</option>
            </select>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}

          {/* History toggle — pushed right */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowPaid((p) => !p)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                showPaid
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-success/40 hover:bg-success/10 hover:text-success"
              )}
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", showPaid && "rotate-180")} />
              History
            </button>

            {showPaid && (
              <div className="inline-flex rounded-md border border-border bg-secondary/30 p-0.5">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.months}
                    onClick={() => setRangeMonths(opt.months)}
                    className={cn(
                      "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
                      rangeMonths === opt.months
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-dashed border-danger/30 bg-danger/5 py-12 text-center">
          <p className="text-sm text-danger font-medium">
            Failed to load payments. Please refresh and try again.
          </p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-8">
          <UpcomingSection
            rows={filteredScheduled}
            onOpenModal={openOccurrenceModal}
          />
          {showPaid && (
            <PaidSection
              rows={filteredPaid}
              rangeMonths={rangeMonths}
              onEditPayment={openPaymentEditModal}
            />
          )}
        </div>
      )}

      <OccurrenceDetailModal
        item={occurrenceModal}
        open={!!occurrenceModal}
        onClose={() => setOccurrenceModal(null)}
      />
      <PaymentEditModal
        item={paymentEditModal}
        open={!!paymentEditModal}
        onClose={() => setPaymentEditModal(null)}
      />
    </div>
  );
}

// ─── Upcoming / Scheduled section ─────────────────────────────────────────────

function UpcomingSection({
  rows,
  onOpenModal,
}: {
  rows: ScheduledRow[];
  onOpenModal: (r: ScheduledRow) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Upcoming
          <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">
            ({rows.length})
          </span>
        </h2>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No upcoming payments scheduled." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isCarried = !!row.carriedFromId;
            const remaining = row.amountCents - (row.paidAmountCents ?? 0);
            const s = STATUS_STYLES[row.status];

            return (
              <div
                key={row.occurrenceId}
                className={cn(
                  "group relative flex items-stretch rounded-lg border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md",
                  row.status === "overdue" && "border-danger/30",
                  isCarried && row.status !== "overdue" && "border-warning/30"
                )}
              >
                {/* Category color strip */}
                <div
                  className="w-1 flex-shrink-0"
                  style={{ backgroundColor: row.categoryColor ?? "#94a3b8" }}
                />

                {/* Main clickable area */}
                <button
                  className="flex-1 flex items-center gap-4 px-4 py-3 text-left min-w-0"
                  onClick={() => onOpenModal(row)}
                >
                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {row.billName}
                      </span>
                      {row.vendorName && (
                        <span className="text-xs text-muted-foreground truncate">
                          {row.vendorName}
                        </span>
                      )}
                    </div>

                    {/* Carried date chain */}
                    {isCarried && row.originalDueDate && row.originalDueDate !== row.dueDate ? (
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-warning">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="tabular-nums">
                          {format(parseISO(row.originalDueDate), "MMM d")}
                        </span>
                        <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="tabular-nums font-medium">
                          {format(parseISO(row.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="tabular-nums">
                          {format(parseISO(row.dueDate), "MMM d, yyyy")}
                        </span>
                        {row.categoryName && (
                          <>
                            <span>·</span>
                            <span>{row.categoryName}</span>
                          </>
                        )}
                      </div>
                    )}

                    {row.notes && (
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                        {row.notes}
                      </p>
                    )}
                  </div>

                  {/* Amount + status */}
                  <div className="flex-shrink-0 text-right">
                    <p className={cn(
                      "font-bold tabular-nums text-sm",
                      row.status === "overdue" ? "text-danger" : "text-foreground"
                    )}>
                      {formatCurrency(remaining)}
                    </p>
                    {row.paidAmountCents && row.paidAmountCents > 0 && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatCurrency(row.paidAmountCents)} paid
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={cn(
                    "flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    s.className
                  )}>
                    {isCarried ? "Carried" : s.label}
                  </span>
                </button>

                {/* Right-side nav links */}
                <div className="flex items-center border-l px-2 gap-1 flex-shrink-0">
                  <Link
                    to="/bills/$id"
                    params={{ id: row.billId }}
                    search={{ occurrence: row.occurrenceId } as never}
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:text-accent hover:bg-muted/50 transition-colors"
                    title="View instance"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Instance</span>
                  </Link>
                  <Link
                    to="/bills/$id"
                    params={{ id: row.billId }}
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:text-accent hover:bg-muted/50 transition-colors"
                    title="View series"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Series</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Paid / history section ───────────────────────────────────────────────────

type MonthGroup = { label: string; key: string; rows: PaidRow[] };

function PaidSection({
  rows,
  rangeMonths,
  onEditPayment,
}: {
  rows: PaidRow[];
  rangeMonths: number;
  onEditPayment: (r: PaidRow) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, PaidRow[]>();
    for (const r of rows) {
      const key = r.paidDate.slice(0, 7);
      (map.get(key) ?? (map.set(key, []), map.get(key)!)).push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, groupRows]) => ({
        key,
        label: format(parseISO(`${key}-01`), "MMMM yyyy"),
        rows: groupRows,
      }));
  }, [rows]);

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Payment History — last {rangeMonths} {rangeMonths === 1 ? "month" : "months"}
        <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">
          ({rows.length})
        </span>
      </h2>

      {rows.length === 0 ? (
        <EmptyState
          message={`No payments recorded in the last ${rangeMonths} ${rangeMonths === 1 ? "month" : "months"}.`}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            const monthTotal = group.rows.reduce((s, r) => s + r.paymentAmountCents, 0);

            return (
              <div key={group.key} className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                {/* Month header */}
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  onClick={() => toggleCollapse(group.key)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform",
                      !isCollapsed && "rotate-90"
                    )} />
                    <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    <span className="text-xs text-muted-foreground/60">
                      {group.rows.length} payment{group.rows.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-success">
                    {formatCurrency(monthTotal)}
                  </span>
                </button>

                {/* Payment rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-border/60">
                    {group.rows.map((row) => (
                      <PaymentHistoryRow
                        key={row.paymentId}
                        row={row}
                        onEdit={() => onEditPayment(row)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentHistoryRow({
  row,
  onEdit,
}: {
  row: PaidRow;
  onEdit: () => void;
}) {
  return (
    <div className="group flex items-stretch hover:bg-muted/10 transition-colors">
      {/* Category color strip */}
      <div
        className="w-0.5 flex-shrink-0"
        style={{ backgroundColor: row.categoryColor ?? "#94a3b8" }}
      />

      {/* Clickable payment info */}
      <button
        className="flex-1 flex items-center gap-4 px-4 py-2.5 text-left min-w-0"
        onClick={onEdit}
        title="Edit payment"
      >
        {/* Date (primary) */}
        <span className="flex-shrink-0 w-24 text-xs font-medium tabular-nums text-foreground">
          {format(parseISO(row.paidDate), "MMM d, yyyy")}
        </span>

        {/* Expense name + due date */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
            {row.billName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            due {format(parseISO(row.occurrenceDueDate), "MMM d, yyyy")}
            {row.vendorName && <> · {row.vendorName}</>}
          </p>
        </div>

        {/* Amount */}
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-success">
            {formatCurrency(row.paymentAmountCents)}
          </p>
          {row.occurrenceAmountCents !== row.paymentAmountCents && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              of {formatCurrency(row.occurrenceAmountCents)}
            </p>
          )}
        </div>

        {/* Occurrence status */}
        <span className={cn(
          "flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          STATUS_STYLES[row.occurrenceStatus].className
        )}>
          {STATUS_STYLES[row.occurrenceStatus].label}
        </span>
      </button>

      {/* Nav links */}
      <div className="flex items-center border-l px-2 gap-1 flex-shrink-0">
        <Link
          to="/bills/$id"
          params={{ id: row.billId }}
          search={{ occurrence: row.occurrenceId } as never}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:text-accent hover:bg-muted/50 transition-colors"
          title="View instance"
          onClick={(e) => e.stopPropagation()}
        >
          <LayoutList className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Instance</span>
        </Link>
        <Link
          to="/bills/$id"
          params={{ id: row.billId }}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:text-accent hover:bg-muted/50 transition-colors"
          title="View series"
          onClick={(e) => e.stopPropagation()}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Series</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-10 text-center">
      <CreditCard className="mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
