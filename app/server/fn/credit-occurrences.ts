import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, inArray, lt } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { creditOccurrences, type CreditOccurrenceStatus } from "~/db/schema/credit-occurrences";
import { credits } from "~/db/schema/credits";
import { generateOccurrenceDates, type RecurrenceRule } from "~/lib/occurrence-generator";
import { toDateStr } from "~/lib/dates";
import { invalidateUserDashboard } from "~/lib/kv-cache";

export const getCreditOccurrences = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      creditId: z.string().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z
        .enum(["pending", "partial", "received", "overdue", "skipped", "carried"])
        .optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const conditions = [
      eq(creditOccurrences.userId, user.id),
      gte(creditOccurrences.dueDate, data.startDate),
      lte(creditOccurrences.dueDate, data.endDate),
    ];
    if (data.creditId) conditions.push(eq(creditOccurrences.creditId, data.creditId));
    if (data.status) conditions.push(eq(creditOccurrences.status, data.status));

    return db
      .select()
      .from(creditOccurrences)
      .where(and(...conditions))
      .all();
  });

export const carryForwardCreditOccurrence = createServerFn()
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
        id: creditOccurrences.id,
        creditId: creditOccurrences.creditId,
        dueDate: creditOccurrences.dueDate,
        amountCents: creditOccurrences.amountCents,
        receivedAmountCents: creditOccurrences.receivedAmountCents,
      })
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occurrence) throw new Error("Occurrence not found");

    const remaining =
      occurrence.amountCents - (occurrence.receivedAmountCents ?? 0);

    if (remaining <= 0) throw new Error("No balance remaining to carry forward");

    const now = new Date();

    await db
      .update(creditOccurrences)
      .set({ status: "carried", updatedAt: now })
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      );

    await db.insert(creditOccurrences).values({
      id: nanoid(),
      userId: user.id,
      creditId: occurrence.creditId,
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

export const reverseCreditCarryForward = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const dest = await db
      .select()
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .get();

    if (!dest) throw new Error("Occurrence not found");
    if (!dest.carriedFromId)
      throw new Error("This occurrence was not carried forward");
    if (dest.receivedAmountCents && dest.receivedAmountCents > 0)
      throw new Error("Cannot reverse a carry forward that already has receipts");

    const source = await db
      .select()
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, dest.carriedFromId),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .get();

    if (!source) throw new Error("Source occurrence not found");

    const now = new Date();
    const today = toDateStr(now);

    const sourceReceived = source.receivedAmountCents ?? 0;
    let restoredStatus: CreditOccurrenceStatus;
    if (sourceReceived > 0) {
      restoredStatus = "partial";
    } else if (source.dueDate < today) {
      restoredStatus = "overdue";
    } else {
      restoredStatus = "pending";
    }

    await db
      .delete(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, dest.id),
          eq(creditOccurrences.userId, user.id)
        )
      );

    await db
      .update(creditOccurrences)
      .set({ status: restoredStatus, updatedAt: now })
      .where(
        and(
          eq(creditOccurrences.id, source.id),
          eq(creditOccurrences.userId, user.id)
        )
      );

    const sourcePeriod = source.dueDate.slice(0, 7);
    const destPeriod = dest.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, sourcePeriod);
    if (destPeriod !== sourcePeriod) {
      await invalidateUserDashboard(env.KV, user.id, destPeriod);
    }
  });

export const generateOccurrencesForCredit = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      creditId: z.string(),
      upToDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const credit = await db
      .select()
      .from(credits)
      .where(and(eq(credits.id, data.creditId), eq(credits.userId, user.id)))
      .get();

    if (!credit) throw new Error("Credit not found");

    const rule: RecurrenceRule = {
      interval: credit.interval as RecurrenceRule["interval"],
      startDate: credit.startDate,
      endDate: credit.endDate,
      dayOfMonth: credit.dayOfMonth,
      dayOfWeek: credit.dayOfWeek,
    };

    const dates = generateOccurrenceDates(rule, credit.startDate, data.upToDate);
    const existing = await db
      .select({ dueDate: creditOccurrences.dueDate })
      .from(creditOccurrences)
      .where(eq(creditOccurrences.creditId, data.creditId))
      .all();

    const existingDates = new Set(
      existing.map((e: { dueDate: string }) => e.dueDate)
    );
    const newDates = dates.filter((d) => !existingDates.has(d));

    if (newDates.length > 0) {
      const now = new Date();
      await db.insert(creditOccurrences).values(
        newDates.map((dueDate) => ({
          id: nanoid(),
          userId: user.id,
          creditId: data.creditId,
          dueDate,
          amountCents: credit.amountCents,
          status: "pending" as const,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    return { inserted: newDates.length };
  });

export const updateCreditOccurrence = createServerFn()
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
      .update(creditOccurrences)
      .set(patch)
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      );
  });

export const reopenCreditOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    const occ = await db
      .select({ dueDate: creditOccurrences.dueDate })
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occ) return;

    const today = toDateStr(new Date());
    const newStatus = occ.dueDate < today ? "overdue" : "pending";

    await db
      .update(creditOccurrences)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      );
  });

export const deleteCreditOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const occ = await db
      .select({ dueDate: creditOccurrences.dueDate })
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occ) return;

    await db
      .delete(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      );

    const period = occ.dueDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, period);
  });

export const sweepOverdueCreditOccurrences = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    const today = toDateStr(new Date());
    await db
      .update(creditOccurrences)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(
        and(
          eq(creditOccurrences.userId, user.id),
          inArray(creditOccurrences.status, ["pending", "partial"]),
          lt(creditOccurrences.dueDate, today)
        )
      );
  });
