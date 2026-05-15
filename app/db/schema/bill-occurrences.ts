import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { bills } from "./bills";

export type OccurrenceStatus = "pending" | "paid" | "overdue" | "skipped";

export const billOccurrences = sqliteTable(
  "bill_occurrences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    dueDate: text("due_date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", {
      enum: ["pending", "paid", "overdue", "skipped"],
    })
      .notNull()
      .default("pending"),
    paidDate: text("paid_date"),
    paidAmountCents: integer("paid_amount_cents"),
    receiptKey: text("receipt_key"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("bill_occurrences_bill_date_idx").on(t.billId, t.dueDate)]
);

export type BillOccurrence = typeof billOccurrences.$inferSelect;
export type NewBillOccurrence = typeof billOccurrences.$inferInsert;
