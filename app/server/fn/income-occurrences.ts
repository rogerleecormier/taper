import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { incomeOccurrences } from "~/db/schema/income-occurrences";
import { invalidateUserDashboard } from "~/lib/kv-cache";

export const getIncomeOccurrences = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      incomeSourceId: z.string().optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const conditions = [
      eq(incomeOccurrences.userId, user.id),
      gte(incomeOccurrences.expectedDate, data.startDate),
      lte(incomeOccurrences.expectedDate, data.endDate),
    ];
    if (data.incomeSourceId) {
      conditions.push(
        eq(incomeOccurrences.incomeSourceId, data.incomeSourceId)
      );
    }
    return db
      .select()
      .from(incomeOccurrences)
      .where(and(...conditions))
      .all();
  });

export const markIncomeReceived = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      receivedAmountCents: z.number().int().positive().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const now = new Date();
    await db
      .update(incomeOccurrences)
      .set({
        status: "received",
        receivedDate: data.receivedDate,
        receivedAmountCents: data.receivedAmountCents ?? null,
        notes: data.notes ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(incomeOccurrences.id, data.id),
          eq(incomeOccurrences.userId, user.id)
        )
      );

    const period = data.receivedDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, period);
  });

export const updateIncomeOccurrence = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      amountCents: z.number().int().positive().optional(),
      expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.amountCents !== undefined) patch.amountCents = data.amountCents;
    if (data.expectedDate !== undefined) patch.expectedDate = data.expectedDate;
    await db
      .update(incomeOccurrences)
      .set(patch)
      .where(and(eq(incomeOccurrences.id, data.id), eq(incomeOccurrences.userId, user.id)));
  });

export const markIncomeSkipped = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .update(incomeOccurrences)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(
        and(
          eq(incomeOccurrences.id, data.id),
          eq(incomeOccurrences.userId, user.id)
        )
      );
  });
