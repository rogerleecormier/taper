import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { billOccurrences } from "./bill-occurrences";

export const billPayments = sqliteTable("bill_payments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  occurrenceId: text("occurrence_id")
    .notNull()
    .references(() => billOccurrences.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  paidDate: text("paid_date").notNull(),
  notes: text("notes"),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type BillPayment = typeof billPayments.$inferSelect;
export type NewBillPayment = typeof billPayments.$inferInsert;
