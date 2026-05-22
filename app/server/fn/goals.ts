import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { goals } from "~/db/schema/goals";
import { goalTransfers } from "~/db/schema/goal-transfers";
import { invalidateUserDashboard } from "~/lib/kv-cache";
import { toDateStr } from "~/lib/dates";

const GoalInputSchema = z.object({
  name: z.string().min(1).max(200),
  targetAmountCents: z.number().int().positive(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isArchived: z.boolean().optional(),
});

const TransferInputSchema = z.object({
  fromGoalId: z.string().nullable().optional(),
  toGoalId: z.string().nullable().optional(),
  amountCents: z.number().int().positive(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

function validateTransferDirection(fromGoalId?: string | null, toGoalId?: string | null) {
  const from = fromGoalId ?? null;
  const to = toGoalId ?? null;
  if (!from && !to) throw new Error("Transfer must include a source or destination goal");
  if (from && to && from === to) throw new Error("Cannot transfer to the same goal");
}

export const getGoals = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ includeArchived: z.boolean().optional() }).optional())
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const includeArchived = data?.includeArchived ?? false;
    const where = includeArchived
      ? eq(goals.userId, user.id)
      : and(eq(goals.userId, user.id), eq(goals.isArchived, false));

    return db
      .select()
      .from(goals)
      .where(where)
      .orderBy(asc(goals.sortOrder), asc(goals.name))
      .all();
  });

export const getGoal = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    return db
      .select()
      .from(goals)
      .where(and(eq(goals.id, data.id), eq(goals.userId, user.id)))
      .get();
  });

export const createGoal = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(GoalInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const now = new Date();
    const id = nanoid();

    await db.insert(goals).values({
      id,
      userId: user.id,
      name: data.name,
      targetAmountCents: data.targetAmountCents,
      allocatedCents: 0,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
      isArchived: data.isArchived ?? false,
      createdAt: now,
      updatedAt: now,
    });

    await invalidateUserDashboard(env.KV, user.id, toDateStr(now).slice(0, 7));
    return { id };
  });

export const updateGoal = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }).merge(GoalInputSchema))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    const now = new Date();

    await db
      .update(goals)
      .set({
        name: data.name,
        targetAmountCents: data.targetAmountCents,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder ?? 0,
        isArchived: data.isArchived ?? false,
        updatedAt: now,
      })
      .where(and(eq(goals.id, data.id), eq(goals.userId, user.id)));

    await invalidateUserDashboard(env.KV, user.id, toDateStr(now).slice(0, 7));
  });

export const deleteGoal = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;

    const goal = await db
      .select({ id: goals.id, allocatedCents: goals.allocatedCents })
      .from(goals)
      .where(and(eq(goals.id, data.id), eq(goals.userId, user.id)))
      .get();

    if (!goal) return;
    if (goal.allocatedCents > 0) {
      throw new Error("Cannot delete a goal with allocated funds. Reallocate funds first.");
    }

    await db.delete(goals).where(and(eq(goals.id, data.id), eq(goals.userId, user.id)));

    await invalidateUserDashboard(env.KV, user.id, toDateStr(new Date()).slice(0, 7));
  });

export const reorderGoals = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ orderedIds: z.array(z.string()) }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await Promise.all(
      data.orderedIds.map((id, index) =>
        db
          .update(goals)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(goals.id, id), eq(goals.userId, user.id)))
      )
    );
  });

export const transferGoalFunds = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(TransferInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user, env } = context;
    validateTransferDirection(data.fromGoalId, data.toGoalId);

    const fromGoalId = data.fromGoalId ?? null;
    const toGoalId = data.toGoalId ?? null;

    const goalIds = [fromGoalId, toGoalId].filter(Boolean) as string[];
    const ownedGoals = goalIds.length
      ? await db
          .select({ id: goals.id, allocatedCents: goals.allocatedCents })
          .from(goals)
          .where(and(eq(goals.userId, user.id), inArray(goals.id, goalIds)))
          .all()
      : [];

    const ownedIds = new Set(ownedGoals.map((g) => g.id));
    if (fromGoalId && !ownedIds.has(fromGoalId)) throw new Error("Unauthorized source goal");
    if (toGoalId && !ownedIds.has(toGoalId)) throw new Error("Unauthorized destination goal");

    if (fromGoalId) {
      const source = ownedGoals.find((g) => g.id === fromGoalId);
      if (!source) throw new Error("Source goal not found");
      if (source.allocatedCents < data.amountCents) {
        throw new Error("Source goal does not have enough allocated funds");
      }
    }

    const now = new Date();

    const executeTransfer = async (tx: typeof db) => {
      if (fromGoalId) {
        await tx
          .update(goals)
          .set({
            allocatedCents: sql`${goals.allocatedCents} - ${data.amountCents}`,
            updatedAt: now,
          })
          .where(and(eq(goals.id, fromGoalId), eq(goals.userId, user.id)));
      }

      if (toGoalId) {
        await tx
          .update(goals)
          .set({
            allocatedCents: sql`${goals.allocatedCents} + ${data.amountCents}`,
            updatedAt: now,
          })
          .where(and(eq(goals.id, toGoalId), eq(goals.userId, user.id)));
      }

      await tx.insert(goalTransfers).values({
        id: nanoid(),
        userId: user.id,
        fromGoalId,
        toGoalId,
        amountCents: data.amountCents,
        transferDate: data.transferDate,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      });
    };

    if (typeof (db as any).transaction === "function") {
      await (db as any).transaction(async (tx: typeof db) => executeTransfer(tx));
    } else {
      await executeTransfer(db);
    }

    const period = data.transferDate.slice(0, 7);
    await invalidateUserDashboard(env.KV, user.id, period);
  });

export const getGoalTransferHistory = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z
      .object({
        goalId: z.string().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .optional()
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;

    const transfers = await db
      .select()
      .from(goalTransfers)
      .where(eq(goalTransfers.userId, user.id))
      .orderBy(desc(goalTransfers.transferDate), desc(goalTransfers.createdAt))
      .all();

    const goalRows = await db
      .select({ id: goals.id, name: goals.name })
      .from(goals)
      .where(eq(goals.userId, user.id))
      .all();
    const goalNameById = new Map(goalRows.map((g) => [g.id, g.name]));

    return transfers.filter((t) => {
      if (data?.goalId && t.fromGoalId !== data.goalId && t.toGoalId !== data.goalId) {
        return false;
      }
      if (data?.startDate && t.transferDate < data.startDate) return false;
      if (data?.endDate && t.transferDate > data.endDate) return false;
      return true;
    }).map((transfer) => ({
      transfer,
      fromGoalName: transfer.fromGoalId ? (goalNameById.get(transfer.fromGoalId) ?? null) : null,
      toGoalName: transfer.toGoalId ? (goalNameById.get(transfer.toGoalId) ?? null) : null,
    }));
  });
