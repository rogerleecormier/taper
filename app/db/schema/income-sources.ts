import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { vendors } from "./vendors";
import { categories } from "./categories";

export const incomeSources = sqliteTable("income_sources", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  vendorId: text("vendor_id").references(() => vendors.id, {
    onDelete: "set null",
  }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  interval: text("interval", {
    enum: ["daily", "weekly", "biweekly", "monthly", "standalone"],
  }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  dayOfMonth: integer("day_of_month"),
  dayOfWeek: integer("day_of_week"),
  sourceType: text("source_type", { enum: ["standard", "payroll"] }).notNull().default("standard"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type IncomeSource = typeof incomeSources.$inferSelect;
export type NewIncomeSource = typeof incomeSources.$inferInsert;
