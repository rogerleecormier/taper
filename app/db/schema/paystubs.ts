import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { incomeSources } from "./income-sources";
import { incomeOccurrences } from "./income-occurrences";

export const paystubs = sqliteTable("paystubs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  incomeSourceId: text("income_source_id")
    .notNull()
    .references(() => incomeSources.id, { onDelete: "cascade" }),
  incomeOccurrenceId: text("income_occurrence_id").references(
    () => incomeOccurrences.id,
    { onDelete: "set null" }
  ),
  payPeriodStart: text("pay_period_start"),
  payPeriodEnd: text("pay_period_end"),
  payDate: text("pay_date"),
  r2Key: text("r2_key"),
  fileName: text("file_name"),
  grossPayCents: integer("gross_pay_cents"),
  netPayCents: integer("net_pay_cents"),
  regularPayCents: integer("regular_pay_cents"),
  overtimePayCents: integer("overtime_pay_cents"),
  otherPayCents: integer("other_pay_cents"),
  status: text("status", {
    enum: ["pending", "analyzing", "analyzed", "error"],
  })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type Paystub = typeof paystubs.$inferSelect;
export type NewPaystub = typeof paystubs.$inferInsert;
