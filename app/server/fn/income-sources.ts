import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc, inArray } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { incomeSources } from "~/db/schema/income-sources";
import { incomeOccurrences } from "~/db/schema/income-occurrences";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import {
  generateOccurrenceDates,
  type RecurrenceRule,
} from "~/lib/occurrence-generator";
import { addMonths } from "date-fns";
import { toDateStr } from "~/lib/dates";

const MAX_GENERATION_MONTHS = 18;

function resolveGenerationWindowEnd(now: Date, endDate: string | null | undefined) {
  const cappedWindowEnd = toDateStr(addMonths(now, MAX_GENERATION_MONTHS));
  if (!endDate) return cappedWindowEnd;
  return endDate < cappedWindowEnd ? endDate : cappedWindowEnd;
}

const IncomeSourceInputSchema = z.object({
  vendorId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  amountCents: z.number().int().positive(),
  interval: z.enum(["daily", "weekly", "biweekly", "monthly", "standalone"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  sourceType: z.enum(["standard", "payroll"]).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

async function generateAndInsertIncomeOccurrences(
  db: any,
  source: {
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
    interval: source.interval as RecurrenceRule["interval"],
    startDate: source.startDate,
    endDate: source.endDate,
    dayOfMonth: source.dayOfMonth,
    dayOfWeek: source.dayOfWeek,
  };

  const dates = generateOccurrenceDates(rule, source.startDate, windowEnd);
  if (dates.length === 0) return;

  const existing = await db
    .select({ expectedDate: incomeOccurrences.expectedDate })
    .from(incomeOccurrences)
    .where(eq(incomeOccurrences.incomeSourceId, source.id))
    .all();

  const existingDates = new Set(existing.map((e: { expectedDate: string }) => e.expectedDate));
  const newDates = dates.filter((d) => !existingDates.has(d));
  if (newDates.length === 0) return;

  const now = new Date();
  const BATCH_SIZE = 10;
  for (let i = 0; i < newDates.length; i += BATCH_SIZE) {
    const batch = newDates.slice(i, i + BATCH_SIZE);
    await db.insert(incomeOccurrences).values(
      batch.map((expectedDate) => ({
        id: nanoid(),
        userId: source.userId,
        incomeSourceId: source.id,
        expectedDate,
        amountCents: source.amountCents,
        status: "pending" as const,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }
}

export const getIncomeSources = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    const rows = await db
      .select({
        source: incomeSources,
        vendor: vendors,
        category: categories,
      })
      .from(incomeSources)
      .leftJoin(vendors, eq(incomeSources.vendorId, vendors.id))
      .leftJoin(categories, eq(incomeSources.categoryId, categories.id))
      .where(eq(incomeSources.userId, user.id))
      .orderBy(asc(incomeSources.sortOrder), asc(incomeSources.name))
      .all();

    return rows.map((r) => ({
      ...r.source,
      vendor: r.vendor,
      category: r.category,
    }));
  });

export const createIncomeSource = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(IncomeSourceInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();
    const id = nanoid();

    await db.insert(incomeSources).values({
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
      sourceType: data.sourceType ?? "standard",
      isActive: true,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    const windowEnd = resolveGenerationWindowEnd(now, data.endDate);
    await generateAndInsertIncomeOccurrences(db, {
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

export const updateIncomeSource = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }).merge(IncomeSourceInputSchema))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();

    await db
      .update(incomeSources)
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
      .where(and(eq(incomeSources.id, data.id), eq(incomeSources.userId, user.id)));

    const windowEnd = resolveGenerationWindowEnd(now, data.endDate);
    const pending = await db
      .select({ id: incomeOccurrences.id })
      .from(incomeOccurrences)
      .where(
        and(
          eq(incomeOccurrences.incomeSourceId, data.id),
          eq(incomeOccurrences.status, "pending")
        )
      )
      .all();

    if (pending.length > 0) {
      await db
        .delete(incomeOccurrences)
        .where(
          inArray(incomeOccurrences.id, pending.map((p: { id: string }) => p.id))
        );
    }

    await generateAndInsertIncomeOccurrences(db, {
      id: data.id,
      userId: user.id,
      amountCents: data.amountCents,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      dayOfMonth: data.dayOfMonth ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
    }, windowEnd);
  });

export const deleteIncomeSource = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .delete(incomeSources)
      .where(and(eq(incomeSources.id, data.id), eq(incomeSources.userId, user.id)));
  });

export const reorderIncomeSources = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ orderedIds: z.array(z.string()) }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await Promise.all(
      data.orderedIds.map((id, index) =>
        db
          .update(incomeSources)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(incomeSources.id, id), eq(incomeSources.userId, user.id)))
      )
    );
  });
