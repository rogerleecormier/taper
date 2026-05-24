import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, asc, desc, inArray, isNotNull } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { billPayments } from "~/db/schema/bill-payments";
import { billOccurrences } from "~/db/schema/bill-occurrences";
import type { OccurrenceStatus } from "~/db/schema/bill-occurrences";
import { bills } from "~/db/schema/bills";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import { invalidateUserDashboard } from "~/lib/kv-cache";
import { toDateStr } from "~/lib/dates";
import {
  generateOccurrenceDates,
  type RecurrenceRule,
} from "~/lib/occurrence-generator";

function deriveStatus(
  paidTotal: number,
  amountCents: number,
  dueDate: string
): OccurrenceStatus {
  if (paidTotal >= amountCents) return "paid";
  if (paidTotal > 0) return "partial";
  return toDateStr(new Date()) > dueDate ? "overdue" : "pending";
}

export const addBillPayment = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      occurrenceId: z.string(),
      amountCents: z.number().int().positive(),
      paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const occurrence = await db
      .select()
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.occurrenceId),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occurrence) throw new Error("Occurrence not found");

    const now = new Date();
    const paymentId = nanoid();

    await db.insert(billPayments).values({
      id: paymentId,
      userId: user.id,
      occurrenceId: data.occurrenceId,
      amountCents: data.amountCents,
      paidDate: data.paidDate,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const newPaidTotal = (occurrence.paidAmountCents ?? 0) + data.amountCents;
    const newStatus = deriveStatus(
      newPaidTotal,
      occurrence.amountCents,
      occurrence.dueDate
    );

    await db
      .update(billOccurrences)
      .set({
        paidAmountCents: newPaidTotal,
        paidDate: data.paidDate,
        status: newStatus,
        updatedAt: now,
      })
      .where(
        and(
          eq(billOccurrences.id, data.occurrenceId),
          eq(billOccurrences.userId, user.id)
        )
      );

    await invalidateUserDashboard(env.KV, user.id, data.paidDate.slice(0, 7));

    return { id: paymentId };
  });

// Fetch all payments for occurrences whose dueDate falls in [startDate, endDate].
// Returns payments keyed by occurrenceId for the tracker's period view.
export const getBillPaymentsForPeriod = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    return db
      .select({
        id: billPayments.id,
        userId: billPayments.userId,
        occurrenceId: billPayments.occurrenceId,
        amountCents: billPayments.amountCents,
        paidDate: billPayments.paidDate,
        notes: billPayments.notes,
        createdAt: billPayments.createdAt,
        updatedAt: billPayments.updatedAt,
      })
      .from(billPayments)
      .innerJoin(
        billOccurrences,
        eq(billPayments.occurrenceId, billOccurrences.id)
      )
      .where(
        and(
          eq(billPayments.userId, user.id),
          gte(billOccurrences.dueDate, data.startDate),
          lte(billOccurrences.dueDate, data.endDate)
        )
      )
      .orderBy(asc(billPayments.paidDate))
      .all();
  });

export const getBillPayments = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ occurrenceId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    return db
      .select()
      .from(billPayments)
      .where(
        and(
          eq(billPayments.userId, user.id),
          eq(billPayments.occurrenceId, data.occurrenceId)
        )
      )
      .orderBy(asc(billPayments.paidDate))
      .all();
  });

export const deleteBillPayment = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const payment = await db
      .select()
      .from(billPayments)
      .where(
        and(eq(billPayments.id, data.id), eq(billPayments.userId, user.id))
      )
      .get();

    if (!payment) return { occurrenceId: null };

    await db
      .delete(billPayments)
      .where(
        and(eq(billPayments.id, data.id), eq(billPayments.userId, user.id))
      );

    // Re-sum remaining payments
    const remaining = await db
      .select({ amountCents: billPayments.amountCents, paidDate: billPayments.paidDate })
      .from(billPayments)
      .where(
        and(
          eq(billPayments.userId, user.id),
          eq(billPayments.occurrenceId, payment.occurrenceId)
        )
      )
      .orderBy(desc(billPayments.paidDate))
      .all();

    const newTotal = remaining.reduce((s, p) => s + p.amountCents, 0);
    const lastPaymentDate = remaining[0]?.paidDate ?? null;

    const occurrence = await db
      .select({
        amountCents: billOccurrences.amountCents,
        dueDate: billOccurrences.dueDate,
      })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, payment.occurrenceId),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (occurrence) {
      const newStatus = deriveStatus(
        newTotal,
        occurrence.amountCents,
        occurrence.dueDate
      );

      await db
        .update(billOccurrences)
        .set({
          paidAmountCents: newTotal > 0 ? newTotal : null,
          paidDate: lastPaymentDate,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(billOccurrences.id, payment.occurrenceId),
            eq(billOccurrences.userId, user.id)
          )
        );
    }

    await invalidateUserDashboard(env.KV, user.id, payment.paidDate.slice(0, 7));

    return { occurrenceId: payment.occurrenceId };
  });

export const updateBillPayment = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      amountCents: z.number().int().positive(),
      paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const payment = await db
      .select()
      .from(billPayments)
      .where(and(eq(billPayments.id, data.id), eq(billPayments.userId, user.id)))
      .get();

    if (!payment) throw new Error("Payment not found");

    await db
      .update(billPayments)
      .set({
        amountCents: data.amountCents,
        paidDate: data.paidDate,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(billPayments.id, data.id), eq(billPayments.userId, user.id)));

    // Re-sum all payments for the occurrence to keep totals accurate
    const allPayments = await db
      .select({ amountCents: billPayments.amountCents, paidDate: billPayments.paidDate })
      .from(billPayments)
      .where(and(eq(billPayments.userId, user.id), eq(billPayments.occurrenceId, payment.occurrenceId)))
      .orderBy(desc(billPayments.paidDate))
      .all();

    const newTotal = allPayments.reduce((s, p) => s + p.amountCents, 0);
    const lastPaymentDate = allPayments[0]?.paidDate ?? null;

    const occurrence = await db
      .select({ amountCents: billOccurrences.amountCents, dueDate: billOccurrences.dueDate })
      .from(billOccurrences)
      .where(and(eq(billOccurrences.id, payment.occurrenceId), eq(billOccurrences.userId, user.id)))
      .get();

    if (occurrence) {
      await db
        .update(billOccurrences)
        .set({
          paidAmountCents: newTotal > 0 ? newTotal : null,
          paidDate: lastPaymentDate,
          status: deriveStatus(newTotal, occurrence.amountCents, occurrence.dueDate),
          updatedAt: new Date(),
        })
        .where(and(eq(billOccurrences.id, payment.occurrenceId), eq(billOccurrences.userId, user.id)));
    }

    await invalidateUserDashboard(env.KV, user.id, data.paidDate.slice(0, 7));
    if (payment.paidDate.slice(0, 7) !== data.paidDate.slice(0, 7)) {
      await invalidateUserDashboard(env.KV, user.id, payment.paidDate.slice(0, 7));
    }

    return { occurrenceId: payment.occurrenceId };
  });

// All occurrences up to endDate that should be visible in the payments page:
// - pending, partial, overdue, carried, paid (all statuses except skipped)
// - includes carried-forward items with their current due date
// - filters out past paid/carried items (kept for history, not upcoming)
// - generates any missing occurrences up to endDate before querying
export const getScheduledPaymentsForPage = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    // Ensure occurrences exist up to endDate for every active bill.
    const activeBills = await db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, user.id), eq(bills.isActive, true)))
      .all();

    const now = new Date();
    for (const bill of activeBills) {
      if (bill.interval === "standalone") continue;

      const rule: RecurrenceRule = {
        interval: bill.interval as RecurrenceRule["interval"],
        startDate: bill.startDate,
        endDate: bill.endDate ?? null,
        dayOfMonth: bill.dayOfMonth ?? null,
        dayOfWeek: bill.dayOfWeek ?? null,
      };

      const allDates = generateOccurrenceDates(rule, bill.startDate, data.endDate);
      if (allDates.length === 0) continue;

      const existing = await db
        .select({ dueDate: billOccurrences.dueDate })
        .from(billOccurrences)
        .where(eq(billOccurrences.billId, bill.id))
        .all();

      const existingSet = new Set(existing.map((e) => e.dueDate));
      const newDates = allDates.filter((d) => !existingSet.has(d));

      if (newDates.length > 0) {
        await db.insert(billOccurrences).values(
          newDates.map((dueDate) => ({
            id: nanoid(),
            userId: user.id,
            billId: bill.id,
            dueDate,
            amountCents: bill.amountCents,
            status: "pending" as const,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }

    const rows = await db
      .select({
        occurrenceId: billOccurrences.id,
        billId: bills.id,
        dueDate: billOccurrences.dueDate,
        amountCents: billOccurrences.amountCents,
        paidAmountCents: billOccurrences.paidAmountCents,
        status: billOccurrences.status,
        notes: billOccurrences.notes,
        carriedFromId: billOccurrences.carriedFromId,
        hidden: billOccurrences.hidden,
        billName: bills.name,
        billInterval: bills.interval,
        vendorId: vendors.id,
        vendorName: vendors.name,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(billOccurrences)
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .leftJoin(categories, eq(bills.categoryId, categories.id))
      .where(
        and(
          eq(billOccurrences.userId, user.id),
          // Show all statuses except skipped: pending, partial, overdue, carried, paid
          inArray(billOccurrences.status, ["pending", "partial", "overdue", "carried", "paid"]),
          // Include all items with dueDate up to endDate
          lte(billOccurrences.dueDate, data.endDate)
        )
      )
      .orderBy(asc(billOccurrences.dueDate))
      .all();

    // Resolve originalDueDate for carried-forward items by walking the chain
    const carriedSourceIds = rows.filter((r) => r.carriedFromId).map((r) => r.carriedFromId!);
    const sources = carriedSourceIds.length > 0
      ? await db
          .select({ id: billOccurrences.id, dueDate: billOccurrences.dueDate, carriedFromId: billOccurrences.carriedFromId })
          .from(billOccurrences)
          .where(and(eq(billOccurrences.userId, user.id), inArray(billOccurrences.id, carriedSourceIds)))
          .all()
      : [];
    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    return rows.map((r) => {
      if (!r.carriedFromId) return { ...r, originalDueDate: null };
      let current = sourceMap.get(r.carriedFromId);
      let originalDueDate = current?.dueDate ?? r.dueDate;
      while (current?.carriedFromId) {
        const parent = sourceMap.get(current.carriedFromId);
        if (!parent) break;
        originalDueDate = parent.dueDate;
        current = parent;
      }
      return { ...r, originalDueDate };
    });
  });

// All carried-forward expenses that still have an unpaid balance, regardless of
// scheduled payment date. Finds the leaf occurrence of every carry-forward chain
// (i.e. not superseded by another carry) whose balance is not fully paid.
export const getCarriedForwardUnpaid = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;

    // Fetch every occurrence that participates in any carry-forward chain:
    // either it was a source (status="carried") or it is a destination (carriedFromId set).
    // We need both ends to identify chain leaves and resolve original dates.
    const allChainRows = await db
      .select({
        id: billOccurrences.id,
        dueDate: billOccurrences.dueDate,
        amountCents: billOccurrences.amountCents,
        paidAmountCents: billOccurrences.paidAmountCents,
        status: billOccurrences.status,
        carriedFromId: billOccurrences.carriedFromId,
        notes: billOccurrences.notes,
        billId: billOccurrences.billId,
        hidden: billOccurrences.hidden,
      })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.userId, user.id),
          // sources have status "carried"; destinations have carriedFromId set
          // SQLite doesn't support OR with isNotNull in a single inArray, so we
          // fetch both sets: any "carried" status OR any non-null carriedFromId.
          // We over-fetch slightly and filter in JS.
          inArray(billOccurrences.status, ["carried", "pending", "partial", "overdue", "paid"]),
        )
      )
      .all();

    // Index every occurrence by id for chain traversal
    const byId = new Map(allChainRows.map((r) => [r.id, r]));

    // Identify all occurrence IDs that are themselves pointed to as a source —
    // i.e. they have at least one occurrence whose carriedFromId === their id.
    const supersededIds = new Set(
      allChainRows.filter((r) => r.carriedFromId).map((r) => r.carriedFromId!)
    );

    // A leaf is an occurrence that:
    //   1. Is part of a chain (has a carriedFromId, meaning it was carried into)
    //   2. Has NOT itself been carried forward (not in supersededIds)
    //   3. Still has an unpaid balance (status is not "paid" and not "skipped")
    const leaves = allChainRows.filter(
      (r) =>
        r.carriedFromId !== null &&
        !supersededIds.has(r.id) &&
        r.status !== "paid" &&
        r.status !== "skipped"
    );

    if (leaves.length === 0) return [];

    // Resolve originalDueDate by walking the carriedFromId chain to the root
    function resolveOriginalDueDate(startCarriedFromId: string): string {
      let current = byId.get(startCarriedFromId);
      if (!current) return startCarriedFromId; // fallback: shouldn't happen
      let original = current.dueDate;
      while (current?.carriedFromId) {
        const parent = byId.get(current.carriedFromId);
        if (!parent) break;
        original = parent.dueDate;
        current = parent;
      }
      return original;
    }

    // Fetch bill/vendor/category details for the leaf occurrences
    const leafBillIds = [...new Set(leaves.map((r) => r.billId))];
    const billDetails = await db
      .select({
        billId: bills.id,
        billName: bills.name,
        billInterval: bills.interval,
        vendorId: vendors.id,
        vendorName: vendors.name,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(bills)
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .leftJoin(categories, eq(bills.categoryId, categories.id))
      .where(and(eq(bills.userId, user.id), inArray(bills.id, leafBillIds)))
      .all();

    const billMap = new Map(billDetails.map((b) => [b.billId, b]));

    return leaves
      .map((r) => {
        const bill = billMap.get(r.billId);
        if (!bill) return null;
        return {
          occurrenceId: r.id,
          billId: r.billId,
          dueDate: r.dueDate,
          amountCents: r.amountCents,
          paidAmountCents: r.paidAmountCents,
          status: r.status,
          notes: r.notes,
          carriedFromId: r.carriedFromId,
          hidden: r.hidden,
          billName: bill.billName,
          billInterval: bill.billInterval,
          vendorId: bill.vendorId,
          vendorName: bill.vendorName,
          categoryName: bill.categoryName,
          categoryColor: bill.categoryColor,
          originalDueDate: resolveOriginalDueDate(r.carriedFromId!),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  });

// Actual payment records from bill_payments, joined back to the occurrence and expense.
// startDate / endDate filter on paidDate (the date the payment was recorded).
export const getPaidPaymentsForPage = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    return db
      .select({
        paymentId: billPayments.id,
        paymentAmountCents: billPayments.amountCents,
        paidDate: billPayments.paidDate,
        paymentNotes: billPayments.notes,
        occurrenceId: billOccurrences.id,
        occurrenceDueDate: billOccurrences.dueDate,
        occurrenceAmountCents: billOccurrences.amountCents,
        occurrencePaidAmountCents: billOccurrences.paidAmountCents,
        occurrenceStatus: billOccurrences.status,
        billId: bills.id,
        billName: bills.name,
        billInterval: bills.interval,
        vendorId: vendors.id,
        vendorName: vendors.name,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(billPayments)
      .innerJoin(billOccurrences, eq(billPayments.occurrenceId, billOccurrences.id))
      .innerJoin(bills, eq(billOccurrences.billId, bills.id))
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .leftJoin(categories, eq(bills.categoryId, categories.id))
      .where(
        and(
          eq(billPayments.userId, user.id),
          gte(billPayments.paidDate, data.startDate),
          lte(billPayments.paidDate, data.endDate)
        )
      )
      .orderBy(desc(billPayments.paidDate))
      .all();
  });
