import { sqliteTable, text, integer, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { goals } from "./goals";

export const goalTransfers = sqliteTable(
  "goal_transfers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fromGoalId: text("from_goal_id").references(() => goals.id, { onDelete: "set null" }),
    toGoalId: text("to_goal_id").references(() => goals.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    transferDate: text("transfer_date").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    check("goal_transfers_positive_amount", sql`${t.amountCents} > 0`),
    check(
      "goal_transfers_valid_direction",
      sql`(${t.fromGoalId} is not null and ${t.toGoalId} is null)
          or (${t.fromGoalId} is null and ${t.toGoalId} is not null)
          or (${t.fromGoalId} is not null and ${t.toGoalId} is not null and ${t.fromGoalId} != ${t.toGoalId})`
    ),
  ]
);

export type GoalTransfer = typeof goalTransfers.$inferSelect;
export type NewGoalTransfer = typeof goalTransfers.$inferInsert;
