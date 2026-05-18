import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, inArray, lt, gt, asc } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { billOccurrences } from "~/db/schema/bill-occurrences";
import { bills } from "~/db/schema/bills";
import { generateOccurrenceDates, type RecurrenceRule } from "~/lib/occurrence-generator";
import { toDateStr } from "~/lib/dates";
import { addDays, parseISO } from "date-fns";
import { addMonths } from "date-fns";
import { invalidateUserDashboard } from "~/lib/kv-cache";

export const getBillOccurrences = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      billId: z.string().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z
        .enum(["pending", "partial", "paid", "overdue", "skipped"])
        .optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const conditions = [
      eq(billOccurrences.userId, user.id),
      gte(billOccurrences.dueDate, data.startDate),
      lte(billOccurrences.dueDate, data.endDate),
    ];
    if (data.billId) conditions.push(eq(billOccurrences.billId, data.billId));
    if (data.status) conditions.push(eq(billOccurrences.status, data.status));

    return db
      .select()
      .from(billOccurrences)
      .where(and(...conditions))
      .all();
  });

export const carryForwardOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const occurrence = await db
      .select({
        id: billOccurrences.id,
        billId: billOccurrences.billId,
        dueDate: billOccurrences.dueDate,
        amountCents: billOccurrences.amountCents,
        paidAmountCents: billOccurrences.paidAmountCents,
      })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occurrence) return;

    const remaining =
      occurrence.amountCents - (occurrence.paidAmountCents ?? 0);

    // Nothing left to carry forward if fully paid
    if (remaining <= 0) return;

    const now = new Date();

    // Mark this occurrence as skipped
    await db
      .update(billOccurrences)
      .set({ status: "skipped", updatedAt: now })
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    // Find the next open occurrence for this bill
    const nextOpenOccurrence = await db
      .select({
        id: billOccurrences.id,
        dueDate: billOccurrences.dueDate,
        amountCents: billOccurrences.amountCents,
      })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.userId, user.id),
          eq(billOccurrences.billId, occurrence.billId),
          gt(billOccurrences.dueDate, occurrence.dueDate),
          inArray(billOccurrences.status, ["pending", "partial", "overdue"])
        )
      )
      .orderBy(asc(billOccurrences.dueDate))
      .get();

    let carryDueDate: string;

    if (nextOpenOccurrence) {
      carryDueDate = nextOpenOccurrence.dueDate;
      await db
        .update(billOccurrences)
        .set({
          amountCents: nextOpenOccurrence.amountCents + remaining,
          updatedAt: now,
        })
        .where(
          and(
            eq(billOccurrences.id, nextOpenOccurrence.id),
            eq(billOccurrences.userId, user.id)
          )
        );
    } else {
      const nextWeekDueDate = toDateStr(
        addDays(parseISO(occurrence.dueDate), 7)
      );
      carryDueDate = nextWeekDueDate;
      await db.insert(billOccurrences).values({
        id: nanoid(),
        userId: user.id,
        billId: occurrence.billId,
        dueDate: nextWeekDueDate,
        amountCents: remaining,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    const sourcePeriod = occurrence.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, sourcePeriod);
    const destinationPeriod = carryDueDate.slice(0, 7);
    if (destinationPeriod !== sourcePeriod) {
      await invalidateUserDashboard(env.KV, user.id, destinationPeriod);
    }
  });

export const generateOccurrencesForBill = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      billId: z.string(),
      upToDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const bill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, data.billId), eq(bills.userId, user.id)))
      .get();

    if (!bill) throw new Error("Bill not found");

    const rule: RecurrenceRule = {
      interval: bill.interval as RecurrenceRule["interval"],
      startDate: bill.startDate,
      endDate: bill.endDate,
      dayOfMonth: bill.dayOfMonth,
      dayOfWeek: bill.dayOfWeek,
    };

    const dates = generateOccurrenceDates(rule, bill.startDate, data.upToDate);
    const existing = await db
      .select({ dueDate: billOccurrences.dueDate })
      .from(billOccurrences)
      .where(eq(billOccurrences.billId, data.billId))
      .all();

    const existingDates = new Set(
      existing.map((e: { dueDate: string }) => e.dueDate)
    );
    const newDates = dates.filter((d) => !existingDates.has(d));

    if (newDates.length > 0) {
      const now = new Date();
      await db.insert(billOccurrences).values(
        newDates.map((dueDate) => ({
          id: nanoid(),
          userId: user.id,
          billId: data.billId,
          dueDate,
          amountCents: bill.amountCents,
          status: "pending" as const,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    return { inserted: newDates.length };
  });

export const updateBillOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      amountCents: z.number().int().positive().optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.amountCents !== undefined) patch.amountCents = data.amountCents;
    if (data.dueDate !== undefined) patch.dueDate = data.dueDate;
    await db
      .update(billOccurrences)
      .set(patch)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );
  });

// Called by scheduled Worker to mark overdue occurrences
export const sweepOverdueOccurrences = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    const today = toDateStr(new Date());
    // Mark both pending and partial (partial = has some payments but balance remains)
    await db
      .update(billOccurrences)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(
        and(
          eq(billOccurrences.userId, user.id),
          inArray(billOccurrences.status, ["pending", "partial"]),
          lt(billOccurrences.dueDate, today)
        )
      );
  });
