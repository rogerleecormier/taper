import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { creditOccurrences } from "./credit-occurrences";

export const creditReceipts = sqliteTable("credit_receipts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  occurrenceId: text("occurrence_id")
    .notNull()
    .references(() => creditOccurrences.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  receivedDate: text("received_date").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type CreditReceipt = typeof creditReceipts.$inferSelect;
export type NewCreditReceipt = typeof creditReceipts.$inferInsert;
