import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  trackerDefaultMode: text("tracker_default_mode").notNull().default("board"),
  trackerDefaultScope: text("tracker_default_scope").notNull().default("month"),
  trackerDefaultMonthInterval: text("tracker_default_month_interval").notNull().default("week"),
  trackerDefaultYearInterval: text("tracker_default_year_interval").notNull().default("month"),
  paydayInterval: text("payday_interval").notNull().default("biweekly"),
  paydayAnchorDate: text("payday_anchor_date"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
