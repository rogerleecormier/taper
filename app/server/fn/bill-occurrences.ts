import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, inArray, lt } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { billOccurrences } from "~/db/schema/bill-occurrences";
import { bills } from "~/db/schema/bills";
import { generateOccurrenceDates, type RecurrenceRule } from "~/lib/occurrence-generator";
import { toDateStr } from "~/lib/dates";
import { addMonths } from "date-fns";
import { invalidateUserDashboard } from "~/lib/kv-cache";

export const getBillOccurrences = createServerFn()
  .middleware([authMiddleware])
  .validator(
    z.object({
      billId: z.string().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z
        .enum(["pending", "paid", "overdue", "skipped"])
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

export const markOccurrencePaid = createServerFn()
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      paidAmountCents: z.number().int().positive().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const now = new Date();
    await db
      .update(billOccurrences)
      .set({
        status: "paid",
        paidDate: data.paidDate,
        paidAmountCents: data.paidAmountCents ?? null,
        notes: data.notes ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    const period = data.paidDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, period);
  });

export const markOccurrenceSkipped = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const occurrence = await db
      .select({ dueDate: billOccurrences.dueDate })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    await db
      .update(billOccurrences)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    if (occurrence) {
      const period = occurrence.dueDate.slice(0, 7);
      await invalidateUserDashboard(env.KV, user.id, period);
    }
  });

export const generateOccurrencesForBill = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ billId: z.string(), upToDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
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

    const existingDates = new Set(existing.map((e: { dueDate: string }) => e.dueDate));
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

// Called by scheduled Worker to mark overdue occurrences
export const sweepOverdueOccurrences = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    const today = toDateStr(new Date());
    await db
      .update(billOccurrences)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(
        and(
          eq(billOccurrences.userId, user.id),
          eq(billOccurrences.status, "pending"),
          lt(billOccurrences.dueDate, today)
        )
      );
  });
