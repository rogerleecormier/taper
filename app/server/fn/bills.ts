import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc, inArray } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { bills } from "~/db/schema/bills";
import { billOccurrences } from "~/db/schema/bill-occurrences";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import {
  generateOccurrenceDates,
  type RecurrenceRule,
} from "~/lib/occurrence-generator";
import { format, addMonths } from "date-fns";
import { toDateStr } from "~/lib/dates";

const BillInputSchema = z.object({
  vendorId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  name: z.string().min(1).max(200),
  amountCents: z.number().int().positive(),
  interval: z.enum(["daily", "weekly", "biweekly", "monthly", "standalone"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  autoPay: z.boolean().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

async function generateAndInsertOccurrences(
  db: any,
  bill: { id: string; userId: string; amountCents: number; interval: string; startDate: string; endDate: string | null; dayOfMonth: number | null; dayOfWeek: number | null },
  windowEnd: string
) {
  const rule: RecurrenceRule = {
    interval: bill.interval as RecurrenceRule["interval"],
    startDate: bill.startDate,
    endDate: bill.endDate,
    dayOfMonth: bill.dayOfMonth,
    dayOfWeek: bill.dayOfWeek,
  };

  const dates = generateOccurrenceDates(rule, bill.startDate, windowEnd);
  if (dates.length === 0) return;

  // Get existing occurrence dates to avoid duplicates (unique index handles this too)
  const existing = await db
    .select({ dueDate: billOccurrences.dueDate })
    .from(billOccurrences)
    .where(eq(billOccurrences.billId, bill.id))
    .all();

  const existingDates = new Set(existing.map((e: { dueDate: string }) => e.dueDate));
  const newDates = dates.filter((d) => !existingDates.has(d));

  if (newDates.length === 0) return;

  const now = new Date();
  await db.insert(billOccurrences).values(
    newDates.map((dueDate) => ({
      id: nanoid(),
      userId: bill.userId,
      billId: bill.id,
      dueDate,
      amountCents: bill.amountCents,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

export const getBills = createServerFn()
  .middleware([authMiddleware])
  .validator(
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
        bill: bills,
        vendor: vendors,
        category: categories,
      })
      .from(bills)
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .leftJoin(categories, eq(bills.categoryId, categories.id))
      .where(eq(bills.userId, user.id))
      .orderBy(asc(bills.sortOrder), asc(bills.name))
      .all();

    return rows.map((r) => ({ ...r.bill, vendor: r.vendor, category: r.category }));
  });

export const getBill = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const rows = await db
      .select({ bill: bills, vendor: vendors, category: categories })
      .from(bills)
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .leftJoin(categories, eq(bills.categoryId, categories.id))
      .where(and(eq(bills.id, data.id), eq(bills.userId, user.id)))
      .all();
    if (!rows[0]) return null;
    return { ...rows[0].bill, vendor: rows[0].vendor, category: rows[0].category };
  });

export const createBill = createServerFn()
  .middleware([authMiddleware])
  .validator(BillInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();
    const id = nanoid();

    await db.insert(bills).values({
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
      autoPay: data.autoPay ?? false,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    // Generate occurrences for next 90 days
    const windowEnd = toDateStr(addMonths(now, 3));
    await generateAndInsertOccurrences(db, {
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

export const updateBill = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }).merge(BillInputSchema))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();

    await db
      .update(bills)
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
        autoPay: data.autoPay ?? false,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: now,
      })
      .where(and(eq(bills.id, data.id), eq(bills.userId, user.id)));

    // Regenerate future occurrences
    const todayStr = toDateStr(now);
    const windowEnd = toDateStr(addMonths(now, 3));

    // Delete pending occurrences from today forward
    const future = await db
      .select({ id: billOccurrences.id })
      .from(billOccurrences)
      .where(
        and(
          eq(billOccurrences.billId, data.id),
          eq(billOccurrences.status, "pending")
        )
      )
      .all();

    if (future.length > 0) {
      await db
        .delete(billOccurrences)
        .where(
          and(
            eq(billOccurrences.billId, data.id),
            eq(billOccurrences.status, "pending"),
            inArray(billOccurrences.id, future.map((f: { id: string }) => f.id))
          )
        );
    }

    await generateAndInsertOccurrences(db, {
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

export const deleteBill = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .delete(bills)
      .where(and(eq(bills.id, data.id), eq(bills.userId, user.id)));
  });

export const reorderBills = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ orderedIds: z.array(z.string()) }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await Promise.all(
      data.orderedIds.map((id, index) =>
        db
          .update(bills)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(bills.id, id), eq(bills.userId, user.id)))
      )
    );
  });
