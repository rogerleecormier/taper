import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { credits } from "~/db/schema/credits";
import { creditOccurrences } from "~/db/schema/credit-occurrences";
import { creditReceipts } from "~/db/schema/credit-receipts";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import {
  generateOccurrenceDates,
  type RecurrenceRule,
} from "~/lib/occurrence-generator";
import { format, addMonths } from "date-fns";
import { toDateStr } from "~/lib/dates";
import { invalidateUserDashboard } from "~/lib/kv-cache";

const CreditInputSchema = z.object({
  vendorId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  amountCents: z.number().int().positive(),
  interval: z.enum(["daily", "weekly", "biweekly", "monthly", "standalone"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

async function generateAndInsertCreditOccurrences(
  db: any,
  credit: {
    id: string;
    userId: string;
    amountCents: number;
    interval: string;
    startDate: string;
    endDate: string | null;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
  },
  windowEnd: string
) {
  const rule: RecurrenceRule = {
    interval: credit.interval as RecurrenceRule["interval"],
    startDate: credit.startDate,
    endDate: credit.endDate,
    dayOfMonth: credit.dayOfMonth,
    dayOfWeek: credit.dayOfWeek,
  };

  const dates = generateOccurrenceDates(rule, credit.startDate, windowEnd);
  if (dates.length === 0) return;

  const existing = await db
    .select({ dueDate: creditOccurrences.dueDate })
    .from(creditOccurrences)
    .where(eq(creditOccurrences.creditId, credit.id))
    .all();

  const existingDates = new Set(existing.map((e: { dueDate: string }) => e.dueDate));
  const newDates = dates.filter((d) => !existingDates.has(d));

  if (newDates.length === 0) return;

  const now = new Date();
  await db.insert(creditOccurrences).values(
    newDates.map((dueDate) => ({
      id: nanoid(),
      userId: credit.userId,
      creditId: credit.id,
      dueDate,
      amountCents: credit.amountCents,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export const getCredits = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z
      .object({
        categoryId: z.string().optional(),
        vendorId: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .optional()
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const rows = await db
      .select({
        credit: credits,
        vendor: vendors,
        category: categories,
      })
      .from(credits)
      .leftJoin(vendors, eq(credits.vendorId, vendors.id))
      .leftJoin(categories, eq(credits.categoryId, categories.id))
      .where(eq(credits.userId, user.id))
      .orderBy(asc(credits.sortOrder), asc(credits.name))
      .all();

    return rows.map((r) => ({ ...r.credit, vendor: r.vendor, category: r.category }));
  });

export const getCredit = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const rows = await db
      .select({ credit: credits, vendor: vendors, category: categories })
      .from(credits)
      .leftJoin(vendors, eq(credits.vendorId, vendors.id))
      .leftJoin(categories, eq(credits.categoryId, categories.id))
      .where(and(eq(credits.id, data.id), eq(credits.userId, user.id)))
      .all();
    if (!rows[0]) return null;
    return { ...rows[0].credit, vendor: rows[0].vendor, category: rows[0].category };
  });

export const createCredit = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(CreditInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();
    const id = nanoid();

    await db.insert(credits).values({
      id,
      userId: user.id,
      vendorId: data.vendorId ?? null,
      categoryId: data.categoryId ?? null,
      name: data.name,
      amountCents: data.amountCents,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
      isActive: true,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    const windowEnd = toDateStr(addMonths(now, 3));
    await generateAndInsertCreditOccurrences(db, {
      id,
      userId: user.id,
      amountCents: data.amountCents,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
    }, windowEnd);

    return { id };
  });

export const updateCredit = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }).merge(CreditInputSchema))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const now = new Date();
    const todayStr = toDateStr(now);
    const currentPeriod = todayStr.slice(0, 7);

    await db
      .update(credits)
      .set({
        vendorId: data.vendorId ?? null,
        categoryId: data.categoryId ?? null,
        name: data.name,
        amountCents: data.amountCents,
        interval: data.interval,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        dayOfMonth: data.dayOfMonth ?? null,
        dayOfWeek: data.dayOfWeek ?? null,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: now,
      })
      .where(and(eq(credits.id, data.id), eq(credits.userId, user.id)));

    const windowEnd = toDateStr(addMonths(now, 3));

    const future = await db
      .select({ id: creditOccurrences.id })
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.creditId, data.id),
          inArray(creditOccurrences.status, ["pending", "overdue"])
        )
      )
      .all();

    if (future.length > 0) {
      await db
        .delete(creditOccurrences)
        .where(
          and(
            eq(creditOccurrences.creditId, data.id),
            inArray(creditOccurrences.status, ["pending", "overdue"]),
            inArray(creditOccurrences.id, future.map((f: { id: string }) => f.id))
          )
        );
    }

    await generateAndInsertCreditOccurrences(db, {
      id: data.id,
      userId: user.id,
      amountCents: data.amountCents,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
    }, windowEnd);

    await Promise.all([
      invalidateUserDashboard(env.KV, user.id, currentPeriod),
      invalidateUserDashboard(env.KV, user.id, data.startDate.slice(0, 7)),
    ]);
  });

export const deleteCredit = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .delete(credits)
      .where(and(eq(credits.id, data.id), eq(credits.userId, user.id)));
  });

export const getCreditHistory = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    const creditRows = await db
      .select({ credit: credits, vendor: vendors, category: categories })
      .from(credits)
      .leftJoin(vendors, eq(credits.vendorId, vendors.id))
      .leftJoin(categories, eq(credits.categoryId, categories.id))
      .where(and(eq(credits.id, data.id), eq(credits.userId, user.id)))
      .all();

    if (!creditRows[0]) return null;
    const credit = {
      ...creditRows[0].credit,
      vendor: creditRows[0].vendor,
      category: creditRows[0].category,
    };

    const occs = await db
      .select()
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.creditId, data.id),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .orderBy(desc(creditOccurrences.dueDate))
      .all();

    if (occs.length === 0) return { credit, occurrences: [] };

    const occurrenceIds = occs.map((o) => o.id);
    const receipts = await db
      .select()
      .from(creditReceipts)
      .where(
        and(
          eq(creditReceipts.userId, user.id),
          inArray(creditReceipts.occurrenceId, occurrenceIds)
        )
      )
      .orderBy(asc(creditReceipts.receivedDate))
      .all();

    const byOcc: Record<string, typeof receipts> = {};
    for (const r of receipts) {
      (byOcc[r.occurrenceId] ??= []).push(r);
    }

    return {
      credit,
      occurrences: occs.map((o) => ({ ...o, receipts: byOcc[o.id] ?? [] })),
    };
  });

export const reorderCredits = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ orderedIds: z.array(z.string()) }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await Promise.all(
      data.orderedIds.map((id, index) =>
        db
          .update(credits)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(credits.id, id), eq(credits.userId, user.id)))
      )
    );
  });
