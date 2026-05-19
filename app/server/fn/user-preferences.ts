import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { userPreferences } from "~/db/schema/user-preferences";

const DEFAULT_PREFS = {
  trackerDefaultMode: "board" as const,
  trackerDefaultScope: "month" as const,
  trackerDefaultMonthInterval: "week" as const,
  trackerDefaultYearInterval: "month" as const,
  paydayInterval: "biweekly" as "weekly" | "biweekly",
  paydayAnchorDate: null as string | null,
};

export const getUserPreferences = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    try {
      const row = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, user.id))
        .get();

      return {
        trackerDefaultMode: (row?.trackerDefaultMode ?? "board") as "board" | "list",
        trackerDefaultScope: (row?.trackerDefaultScope ?? "month") as "month" | "year",
        trackerDefaultMonthInterval: (row?.trackerDefaultMonthInterval ?? "week") as "day" | "week" | "biweek" | "month" | "pay-period",
        trackerDefaultYearInterval: (row?.trackerDefaultYearInterval ?? "month") as "month" | "quarter" | "half" | "year",
        paydayInterval: (row?.paydayInterval ?? "biweekly") as "weekly" | "biweekly",
        paydayAnchorDate: row?.paydayAnchorDate ?? null,
      };
    } catch {
      return DEFAULT_PREFS;
    }
  });

export const updateUserPreferences = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      trackerDefaultMode: z.enum(["board", "list"]).optional(),
      trackerDefaultScope: z.enum(["month", "year"]).optional(),
      trackerDefaultMonthInterval: z.enum(["day", "week", "biweek", "month", "pay-period"]).optional(),
      trackerDefaultYearInterval: z.enum(["month", "quarter", "half", "year"]).optional(),
      paydayInterval: z.enum(["weekly", "biweekly"]).optional(),
      paydayAnchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();

    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .get();

    if (existing) {
      await db
        .update(userPreferences)
        .set({ ...data, updatedAt: now })
        .where(eq(userPreferences.userId, user.id));
    } else {
      await db.insert(userPreferences).values({
        userId: user.id,
        trackerDefaultMode: data.trackerDefaultMode ?? "board",
        trackerDefaultScope: data.trackerDefaultScope ?? "month",
        trackerDefaultMonthInterval: data.trackerDefaultMonthInterval ?? "week",
        trackerDefaultYearInterval: data.trackerDefaultYearInterval ?? "month",
        paydayInterval: data.paydayInterval ?? "biweekly",
        paydayAnchorDate: data.paydayAnchorDate ?? null,
        updatedAt: now,
      });
    }
  });
