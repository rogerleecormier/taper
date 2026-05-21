import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { credits } from "./credits";

export type CreditOccurrenceStatus =
  | "pending"
  | "partial"
  | "received"
  | "overdue"
  | "skipped"
  | "carried";

export const creditOccurrences = sqliteTable(
  "credit_occurrences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    creditId: text("credit_id")
      .notNull()
      .references(() => credits.id, { onDelete: "cascade" }),
    dueDate: text("due_date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", {
      enum: ["pending", "partial", "received", "overdue", "skipped", "carried"],
    })
      .notNull()
      .default("pending"),
    receivedDate: text("received_date"),
    receivedAmountCents: integer("received_amount_cents"),
    carriedFromId: text("carried_from_id"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  () => []
);

export type CreditOccurrence = typeof creditOccurrences.$inferSelect;
export type NewCreditOccurrence = typeof creditOccurrences.$inferInsert;
