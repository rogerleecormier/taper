import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { adminMiddleware } from "~/server/middleware";
import { categories } from "~/db/schema/categories";
import { bills } from "~/db/schema/bills";
import { incomeSources } from "~/db/schema/income-sources";
import { credits } from "~/db/schema/credits";
import { goals } from "~/db/schema/goals";

export const seedDemoData = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context;
    const now = new Date();

    // Look up the demo user's categories by name
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, data.userId));

    const catId = (name: string) =>
      userCategories.find((c) => c.name === name)?.id ?? null;

    // Bills / expenses
    const demoExpenses: Array<{
      name: string;
      amountCents: number;
      interval: "monthly";
      dayOfMonth: number;
      categoryName: string;
      sortOrder: number;
    }> = [
      { name: "Rent", amountCents: 150000, interval: "monthly", dayOfMonth: 1, categoryName: "Housing", sortOrder: 10 },
      { name: "Electric", amountCents: 11800, interval: "monthly", dayOfMonth: 15, categoryName: "Utilities", sortOrder: 20 },
      { name: "Internet", amountCents: 7999, interval: "monthly", dayOfMonth: 10, categoryName: "Utilities", sortOrder: 30 },
      { name: "Phone", amountCents: 7500, interval: "monthly", dayOfMonth: 5, categoryName: "Utilities", sortOrder: 40 },
      { name: "Car Payment", amountCents: 35000, interval: "monthly", dayOfMonth: 20, categoryName: "Auto", sortOrder: 50 },
      { name: "Car Insurance", amountCents: 15000, interval: "monthly", dayOfMonth: 20, categoryName: "Insurance", sortOrder: 60 },
      { name: "Renters Insurance", amountCents: 2000, interval: "monthly", dayOfMonth: 1, categoryName: "Insurance", sortOrder: 70 },
      { name: "Netflix", amountCents: 1799, interval: "monthly", dayOfMonth: 12, categoryName: "Subscriptions", sortOrder: 80 },
      { name: "Spotify", amountCents: 1199, interval: "monthly", dayOfMonth: 8, categoryName: "Subscriptions", sortOrder: 90 },
      { name: "Gym Membership", amountCents: 4500, interval: "monthly", dayOfMonth: 3, categoryName: "Personal Care", sortOrder: 100 },
    ];

    for (const expense of demoExpenses) {
      await db.insert(bills).values({
        id: nanoid(),
        userId: data.userId,
        categoryId: catId(expense.categoryName),
        vendorId: null,
        name: expense.name,
        amountCents: expense.amountCents,
        interval: expense.interval,
        startDate: "2025-01-01",
        dayOfMonth: expense.dayOfMonth,
        isActive: true,
        autoPay: false,
        sortOrder: expense.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Income sources — biweekly salary + monthly freelance
    await db.insert(incomeSources).values({
      id: nanoid(),
      userId: data.userId,
      categoryId: catId("Salary"),
      vendorId: null,
      name: "Salary",
      amountCents: 480000,
      interval: "biweekly",
      startDate: "2025-01-03",
      dayOfMonth: null,
      dayOfWeek: 5,
      sourceType: "standard",
      isActive: true,
      sortOrder: 10,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(incomeSources).values({
      id: nanoid(),
      userId: data.userId,
      categoryId: catId("Freelance"),
      vendorId: null,
      name: "Freelance Income",
      amountCents: 50000,
      interval: "monthly",
      startDate: "2025-01-01",
      dayOfMonth: 28,
      dayOfWeek: null,
      sourceType: "standard",
      isActive: true,
      sortOrder: 20,
      createdAt: now,
      updatedAt: now,
    });

    // Credits
    await db.insert(credits).values({
      id: nanoid(),
      userId: data.userId,
      categoryId: catId("Debt Payments"),
      vendorId: null,
      name: "Visa Rewards Card",
      amountCents: 25000,
      interval: "monthly",
      startDate: "2025-01-01",
      dayOfMonth: 22,
      isActive: true,
      sortOrder: 10,
      createdAt: now,
      updatedAt: now,
    });

    // Goals
    const demoGoals = [
      { name: "Emergency Fund", targetAmountCents: 500000, allocatedCents: 187500, notes: "3–6 months of expenses", sortOrder: 10 },
      { name: "Vacation", targetAmountCents: 200000, allocatedCents: 45000, notes: "Summer trip", sortOrder: 20 },
      { name: "New Car Down Payment", targetAmountCents: 300000, allocatedCents: 80000, notes: null, sortOrder: 30 },
    ];

    for (const goal of demoGoals) {
      await db.insert(goals).values({
        id: nanoid(),
        userId: data.userId,
        name: goal.name,
        targetAmountCents: goal.targetAmountCents,
        allocatedCents: goal.allocatedCents,
        notes: goal.notes,
        sortOrder: goal.sortOrder,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  });
