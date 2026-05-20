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

// All pending / partial / overdue occurrences with expense + vendor + category context.
export const getScheduledPaymentsForPage = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;

    return db
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
          inArray(billOccurrences.status, ["pending", "partial", "overdue"])
        )
      )
      .orderBy(asc(billOccurrences.dueDate))
      .all();
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
