import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, asc, desc, inArray } from "drizzle-orm";
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

// All pending / partial / overdue occurrences within [today, endDate], plus any overdue
// from before today (those are always included regardless of range).
// Generates any missing occurrences up to endDate before querying.
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
          inArray(billOccurrences.status, ["pending", "partial", "overdue", "carried", "paid"]),
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

// All carried-forward occurrences that are still unpaid (pending/partial/overdue).
// Used by the dashboard carry-forward activity list.
export const getCarriedForwardUnpaid = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;

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
          inArray(billOccurrences.status, ["pending", "partial", "overdue"]),
        )
      )
      .orderBy(asc(billOccurrences.dueDate))
      .all();

    // Filter to only those with a carriedFromId (i.e. were carried forward)
    const carried = rows.filter((r) => r.carriedFromId);

    // Resolve originalDueDate by walking the carriedFromId chain
    const sourceIds = carried.map((r) => r.carriedFromId!);
    const sources = sourceIds.length > 0
      ? await db
          .select({ id: billOccurrences.id, dueDate: billOccurrences.dueDate, carriedFromId: billOccurrences.carriedFromId })
          .from(billOccurrences)
          .where(and(eq(billOccurrences.userId, user.id), inArray(billOccurrences.id, sourceIds)))
          .all()
      : [];

    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    return carried.map((r) => {
      // Walk chain to find original date
      let current = sourceMap.get(r.carriedFromId!);
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
