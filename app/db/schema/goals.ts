import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmountCents: integer("target_amount_cents").notNull(),
  allocatedCents: integer("allocated_cents").notNull().default(0),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
