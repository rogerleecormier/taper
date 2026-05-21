import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, asc, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { creditReceipts } from "~/db/schema/credit-receipts";
import { creditOccurrences } from "~/db/schema/credit-occurrences";
import type { CreditOccurrenceStatus } from "~/db/schema/credit-occurrences";
import { credits } from "~/db/schema/credits";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import { invalidateUserDashboard } from "~/lib/kv-cache";
import { toDateStr } from "~/lib/dates";
import {
  generateOccurrenceDates,
  type RecurrenceRule,
} from "~/lib/occurrence-generator";

function deriveStatus(
  receivedTotal: number,
  amountCents: number,
  dueDate: string
): CreditOccurrenceStatus {
  if (receivedTotal >= amountCents) return "received";
  if (receivedTotal > 0) return "partial";
  return toDateStr(new Date()) > dueDate ? "overdue" : "pending";
}

export const addCreditReceipt = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      occurrenceId: z.string(),
      amountCents: z.number().int().positive(),
      receivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const occurrence = await db
      .select()
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, data.occurrenceId),
          eq(creditOccurrences.userId, user.id)
        )
      )
      .get();

    if (!occurrence) throw new Error("Occurrence not found");

    const now = new Date();
    const receiptId = nanoid();

    await db.insert(creditReceipts).values({
      id: receiptId,
      userId: user.id,
      occurrenceId: data.occurrenceId,
      amountCents: data.amountCents,
      receivedDate: data.receivedDate,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const newReceivedTotal = (occurrence.receivedAmountCents ?? 0) + data.amountCents;
    const newStatus = deriveStatus(
      newReceivedTotal,
      occurrence.amountCents,
      occurrence.dueDate
    );

    await db
      .update(creditOccurrences)
      .set({
        receivedAmountCents: newReceivedTotal,
        receivedDate: data.receivedDate,
        status: newStatus,
        updatedAt: now,
      })
      .where(
        and(
          eq(creditOccurrences.id, data.occurrenceId),
          eq(creditOccurrences.userId, user.id)
        )
      );

    await invalidateUserDashboard(env.KV, user.id, data.receivedDate.slice(0, 7));

    return { id: receiptId };
  });

export const getCreditReceiptsForPeriod = createServerFn()
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
        id: creditReceipts.id,
        userId: creditReceipts.userId,
        occurrenceId: creditReceipts.occurrenceId,
        amountCents: creditReceipts.amountCents,
        receivedDate: creditReceipts.receivedDate,
        notes: creditReceipts.notes,
        createdAt: creditReceipts.createdAt,
        updatedAt: creditReceipts.updatedAt,
      })
      .from(creditReceipts)
      .innerJoin(
        creditOccurrences,
        eq(creditReceipts.occurrenceId, creditOccurrences.id)
      )
      .where(
        and(
          eq(creditReceipts.userId, user.id),
          gte(creditOccurrences.dueDate, data.startDate),
          lte(creditOccurrences.dueDate, data.endDate)
        )
      )
      .orderBy(asc(creditReceipts.receivedDate))
      .all();
  });

export const getCreditReceipts = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ occurrenceId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    return db
      .select()
      .from(creditReceipts)
      .where(
        and(
          eq(creditReceipts.userId, user.id),
          eq(creditReceipts.occurrenceId, data.occurrenceId)
        )
      )
      .orderBy(asc(creditReceipts.receivedDate))
      .all();
  });

export const deleteCreditReceipt = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const receipt = await db
      .select()
      .from(creditReceipts)
      .where(
        and(eq(creditReceipts.id, data.id), eq(creditReceipts.userId, user.id))
      )
      .get();

    if (!receipt) return { occurrenceId: null };

    await db
      .delete(creditReceipts)
      .where(
        and(eq(creditReceipts.id, data.id), eq(creditReceipts.userId, user.id))
      );

    const remaining = await db
      .select({ amountCents: creditReceipts.amountCents, receivedDate: creditReceipts.receivedDate })
      .from(creditReceipts)
      .where(
        and(
          eq(creditReceipts.userId, user.id),
          eq(creditReceipts.occurrenceId, receipt.occurrenceId)
        )
      )
      .orderBy(desc(creditReceipts.receivedDate))
      .all();

    const newTotal = remaining.reduce((s, r) => s + r.amountCents, 0);
    const lastReceivedDate = remaining[0]?.receivedDate ?? null;

    const occurrence = await db
      .select({
        amountCents: creditOccurrences.amountCents,
        dueDate: creditOccurrences.dueDate,
      })
      .from(creditOccurrences)
      .where(
        and(
          eq(creditOccurrences.id, receipt.occurrenceId),
          eq(creditOccurrences.userId, user.id)
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
        .update(creditOccurrences)
        .set({
          receivedAmountCents: newTotal > 0 ? newTotal : null,
          receivedDate: lastReceivedDate,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(creditOccurrences.id, receipt.occurrenceId),
            eq(creditOccurrences.userId, user.id)
          )
        );
    }

    await invalidateUserDashboard(env.KV, user.id, receipt.receivedDate.slice(0, 7));

    return { occurrenceId: receipt.occurrenceId };
  });

export const getScheduledCreditsForPage = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const { nanoid: _nanoid } = await import("nanoid");

    const activeCredits = await db
      .select()
      .from(credits)
      .where(and(eq(credits.userId, user.id), eq(credits.isActive, true)))
      .all();

    const now = new Date();
    for (const credit of activeCredits) {
      if (credit.interval === "standalone") continue;

      const rule: RecurrenceRule = {
        interval: credit.interval as RecurrenceRule["interval"],
        startDate: credit.startDate,
        endDate: credit.endDate ?? null,
        dayOfMonth: credit.dayOfMonth ?? null,
        dayOfWeek: credit.dayOfWeek ?? null,
      };

      const allDates = generateOccurrenceDates(rule, credit.startDate, data.endDate);
      if (allDates.length === 0) continue;

      const existing = await db
        .select({ dueDate: creditOccurrences.dueDate })
        .from(creditOccurrences)
        .where(eq(creditOccurrences.creditId, credit.id))
        .all();

      const existingSet = new Set(existing.map((e) => e.dueDate));
      const newDates = allDates.filter((d) => !existingSet.has(d));

      if (newDates.length > 0) {
        const { nanoid } = await import("nanoid");
        await db.insert(creditOccurrences).values(
          newDates.map((dueDate) => ({
            id: nanoid(),
            userId: user.id,
            creditId: credit.id,
            dueDate,
            amountCents: credit.amountCents,
            status: "pending" as const,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }
    }

    return db
      .select({
        occurrenceId: creditOccurrences.id,
        creditId: credits.id,
        dueDate: creditOccurrences.dueDate,
        amountCents: creditOccurrences.amountCents,
        receivedAmountCents: creditOccurrences.receivedAmountCents,
        status: creditOccurrences.status,
        notes: creditOccurrences.notes,
        carriedFromId: creditOccurrences.carriedFromId,
        creditName: credits.name,
        creditInterval: credits.interval,
        vendorId: vendors.id,
        vendorName: vendors.name,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(creditOccurrences)
      .innerJoin(credits, eq(creditOccurrences.creditId, credits.id))
      .leftJoin(vendors, eq(credits.vendorId, vendors.id))
      .leftJoin(categories, eq(credits.categoryId, categories.id))
      .where(
        and(
          eq(creditOccurrences.userId, user.id),
          inArray(creditOccurrences.status, ["pending", "partial", "overdue"]),
          lte(creditOccurrences.dueDate, data.endDate)
        )
      )
      .orderBy(asc(creditOccurrences.dueDate))
      .all();
  });

export const getReceivedCreditsForPage = createServerFn()
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
        receiptId: creditReceipts.id,
        receiptAmountCents: creditReceipts.amountCents,
        receivedDate: creditReceipts.receivedDate,
        receiptNotes: creditReceipts.notes,
        occurrenceId: creditOccurrences.id,
        occurrenceDueDate: creditOccurrences.dueDate,
        occurrenceAmountCents: creditOccurrences.amountCents,
        occurrenceReceivedAmountCents: creditOccurrences.receivedAmountCents,
        occurrenceStatus: creditOccurrences.status,
        creditId: credits.id,
        creditName: credits.name,
        creditInterval: credits.interval,
        vendorId: vendors.id,
        vendorName: vendors.name,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(creditReceipts)
      .innerJoin(creditOccurrences, eq(creditReceipts.occurrenceId, creditOccurrences.id))
      .innerJoin(credits, eq(creditOccurrences.creditId, credits.id))
      .leftJoin(vendors, eq(credits.vendorId, vendors.id))
      .leftJoin(categories, eq(credits.categoryId, categories.id))
      .where(
        and(
          eq(creditReceipts.userId, user.id),
          gte(creditReceipts.receivedDate, data.startDate),
          lte(creditReceipts.receivedDate, data.endDate)
        )
      )
      .orderBy(desc(creditReceipts.receivedDate))
      .all();
  });
