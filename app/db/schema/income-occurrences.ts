import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { incomeSources } from "./income-sources";

export type IncomeOccurrenceStatus = "pending" | "received" | "late" | "skipped";

export const incomeOccurrences = sqliteTable(
  "income_occurrences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    incomeSourceId: text("income_source_id")
      .notNull()
      .references(() => incomeSources.id, { onDelete: "cascade" }),
    expectedDate: text("expected_date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", {
      enum: ["pending", "received", "late", "skipped"],
    })
      .notNull()
      .default("pending"),
    receivedDate: text("received_date"),
    receivedAmountCents: integer("received_amount_cents"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("income_occurrences_source_date_idx").on(
      t.incomeSourceId,
      t.expectedDate
    ),
  ]
);

export type IncomeOccurrence = typeof incomeOccurrences.$inferSelect;
export type NewIncomeOccurrence = typeof incomeOccurrences.$inferInsert;
