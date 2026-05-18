import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { paystubs } from "./paystubs";

export type DeductionCategory =
  | "federal_tax"
  | "state_tax"
  | "local_tax"
  | "social_security"
  | "medicare"
  | "health_insurance"
  | "dental"
  | "vision"
  | "retirement_401k"
  | "retirement_roth"
  | "hsa"
  | "fsa"
  | "life_insurance"
  | "disability_insurance"
  | "garnishment"
  | "child_support"
  | "other";

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionCategory, string> = {
  federal_tax: "Federal Income Tax",
  state_tax: "State Income Tax",
  local_tax: "Local Tax",
  social_security: "Social Security",
  medicare: "Medicare",
  health_insurance: "Health Insurance",
  dental: "Dental Insurance",
  vision: "Vision Insurance",
  retirement_401k: "401(k)",
  retirement_roth: "Roth 401(k)",
  hsa: "HSA",
  fsa: "FSA",
  life_insurance: "Life Insurance",
  disability_insurance: "Disability Insurance",
  garnishment: "Garnishment",
  child_support: "Child Support",
  other: "Other",
};

export const paystubDeductions = sqliteTable("paystub_deductions", {
  id: text("id").primaryKey(),
  paystubId: text("paystub_id")
    .notNull()
    .references(() => paystubs.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  category: text("category").notNull().default("other"),
  amountCents: integer("amount_cents").notNull(),
  isPretax: integer("is_pretax", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type PaystubDeduction = typeof paystubDeductions.$inferSelect;
