import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, inArray, lt } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { billOccurrences, type OccurrenceStatus } from "~/db/schema/bill-occurrences";
import { bills } from "~/db/schema/bills";
import { generateOccurrenceDates, type RecurrenceRule } from "~/lib/occurrence-generator";
import { toDateStr } from "~/lib/dates";
import { invalidateUserDashboard } from "~/lib/kv-cache";

export const getBillOccurrences = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      billId: z.string().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z
        .enum(["pending", "partial", "paid", "overdue", "skipped", "carried"])
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
  .inputValidator(
    z.object({
      id: z.string(),
      targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
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

    if (!occurrence) throw new Error("Occurrence not found");

    const remaining =
      occurrence.amountCents - (occurrence.paidAmountCents ?? 0);

    if (remaining <= 0) throw new Error("No balance remaining to carry forward");

    const now = new Date();

    // Mark source as carried — partially paid, remaining balance deferred to new instance
    await db
      .update(billOccurrences)
      .set({ status: "carried", updatedAt: now })
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    // Always create a brand-new standalone occurrence — never mutate an existing one
    await db.insert(billOccurrences).values({
      id: nanoid(),
      userId: user.id,
      billId: occurrence.billId,
      dueDate: data.targetDate,
      amountCents: remaining,
      status: "pending",
      carriedFromId: data.id,
      createdAt: now,
      updatedAt: now,
    });

    const sourcePeriod = occurrence.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, sourcePeriod);
    const destinationPeriod = data.targetDate.slice(0, 7);
    if (destinationPeriod !== sourcePeriod) {
      await invalidateUserDashboard(env.KV, user.id, destinationPeriod);
    }
  });

export const reverseCarryForward = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const dest = await db
      .select()
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (!dest) throw new Error("Occurrence not found");
    if (!dest.carriedFromId)
      throw new Error("This occurrence was not carried forward");
    if (dest.paidAmountCents && dest.paidAmountCents > 0)
      throw new Error("Cannot reverse a carry forward that already has payments");

    const source = await db
      .select()
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, dest.carriedFromId),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (!source) throw new Error("Source occurrence not found");

    const now = new Date();
    const today = toDateStr(now);

    const sourcePaid = source.paidAmountCents ?? 0;
    let restoredStatus: OccurrenceStatus;
    if (sourcePaid > 0) {
      restoredStatus = "partial";
    } else if (source.dueDate < today) {
      restoredStatus = "overdue";
    } else {
      restoredStatus = "pending";
    }

    await db
      .delete(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, dest.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    await db
      .update(billOccurrences)
      .set({ status: restoredStatus, updatedAt: now })
      .where(
        and(
          eq(billOccurrences.id, source.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    const sourcePeriod = source.dueDate.slice(0, 7);
    const destPeriod = dest.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, sourcePeriod);
    if (destPeriod !== sourcePeriod) {
      await invalidateUserDashboard(env.KV, user.id, destPeriod);
    }
  });

// Reverse a carry-forward by supplying the *source* (carried) occurrence ID.
// Finds the unpaid destination occurrence and reverses it.
export const reverseCarryForwardBySource = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ sourceId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const source = await db
      .select()
      .from(billOccurrences)
      .where(and(eq(billOccurrences.id, data.sourceId), eq(billOccurrences.userId, user.id)))
      .get();

    if (!source) throw new Error("Source occurrence not found");
    if (source.status !== "carried") throw new Error("Source occurrence is not in carried status");

    const dest = await db
      .select()
      .from(billOccurrences)
      .where(and(eq(billOccurrences.carriedFromId, data.sourceId), eq(billOccurrences.userId, user.id)))
      .get();

    if (!dest) throw new Error("Destination occurrence not found");
    if (dest.paidAmountCents && dest.paidAmountCents > 0)
      throw new Error("Cannot reverse a carry forward that already has payments");

    const now = new Date();
    const today = toDateStr(now);

    const sourcePaid = source.paidAmountCents ?? 0;
    let restoredStatus: OccurrenceStatus;
    if (sourcePaid > 0) {
      restoredStatus = "partial";
    } else if (source.dueDate < today) {
      restoredStatus = "overdue";
    } else {
      restoredStatus = "pending";
    }

    await db.delete(billOccurrences).where(
      and(eq(billOccurrences.id, dest.id), eq(billOccurrences.userId, user.id))
    );

    await db.update(billOccurrences)
      .set({ status: restoredStatus, updatedAt: now })
      .where(and(eq(billOccurrences.id, source.id), eq(billOccurrences.userId, user.id)));

    const sourcePeriod = source.dueDate.slice(0, 7);
    const destPeriod = dest.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, sourcePeriod);
    if (destPeriod !== sourcePeriod) {
      await invalidateUserDashboard(env.KV, user.id, destPeriod);
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

export const reopenOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    const occ = await db
      .select({ dueDate: billOccurrences.dueDate })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occ) return;

    const today = toDateStr(new Date());
    const newStatus = occ.dueDate < today ? "overdue" : "pending";

    await db
      .update(billOccurrences)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );
  });

export const deleteOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const occ = await db
      .select({ dueDate: billOccurrences.dueDate })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occ) return;

    // bill_payments cascade-deletes on occurrence delete (FK onDelete: cascade)
    await db
      .delete(billOccurrences)
      .where(
        and(
          eq(billOccurrences.id, data.id),
          eq(billOccurrences.userId, user.id)
        )
      );

    const period = occ.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, period);
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
