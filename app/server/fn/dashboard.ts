import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gte, lte, lt, desc, asc, inArray, or } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { bills } from "~/db/schema/bills";
import { billOccurrences } from "~/db/schema/bill-occurrences";
import { billPayments } from "~/db/schema/bill-payments";
import { incomeOccurrences } from "~/db/schema/income-occurrences";
import { creditOccurrences } from "~/db/schema/credit-occurrences";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import { goals } from "~/db/schema/goals";
import { goalTransfers } from "~/db/schema/goal-transfers";
import { getCachedOrFetch, dashboardCacheKey } from "~/lib/kv-cache";
import { toDateStr, getPeriodEnd } from "~/lib/dates";
import { addDays, format, parseISO } from "date-fns";

export type DashboardData = {
  periodLabel: string;
  totalMonthlyIncomeCents: number;
  totalMonthlyExpensesCents: number;
  totalCreditsCents: number;
  netBalanceCents: number;
  unallocatedCents: number;
  totalGoalAllocatedCents: number;
  goals: Array<{
    id: string;
    name: string;
    targetAmountCents: number;
    allocatedCents: number;
    remainingCents: number;
    progressPercent: number;
  }>;
  upcomingBills: Array<{
    id: string;
    billId: string;
    billName: string;
    vendorName: string | null;
    categoryName: string | null;
    categoryColor: string | null;
    dueDate: string;
    amountCents: number;
    paidAmountCents: number | null;
    carriedFromId: string | null;
    status: string;
    hidden: boolean;
  }>;
  overdueBills: Array<{
    id: string;
    billId: string;
    billName: string;
    dueDate: string;
    amountCents: number;
    paidAmountCents: number;
    status: string;
    hidden: boolean;
  }>;
  recentPayments: Array<{
    id: string;
    billId: string;
    billName: string;
    paidDate: string;
    paidAmountCents: number;
    vendorName: string | null;
    categoryColor: string | null;
  }>;
  categoryBreakdown: Array<{
    categoryId: string | null;
    categoryName: string;
    color: string | null;
    totalCents: number;
    percentage: number;
  }>;
};

export const getDashboardData = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      upcomingDays: z.union([
        z.literal(7),
        z.literal(14),
        z.literal(30),
      ]).default(7),
      periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data, context }): Promise<DashboardData> => {
    const { db, user, env } = context;
    const { periodStart, periodEnd } = data;
    const actualToday = toDateStr(new Date());
    const upcomingEnd = toDateStr(
      addDays(new Date(`${actualToday}T00:00:00`), data.upcomingDays)
    );

    // Build a human-readable period label
    const ps = parseISO(periodStart);
    const pe = parseISO(periodEnd);
    const periodLabel = ps.getMonth() === pe.getMonth() && ps.getFullYear() === pe.getFullYear()
      ? `${format(ps, "MMM d")} – ${format(pe, "d, yyyy")}`
      : `${format(ps, "MMM d")} – ${format(pe, "MMM d, yyyy")}`;

    const cacheKey = dashboardCacheKey(
      user.id,
      `${periodStart}-${periodEnd}-${actualToday}-${data.upcomingDays}`
    );

    return getCachedOrFetch(env.KV, cacheKey, 300, async () => {
      const [
        periodIncomeOccurrences,
        periodBillOccurrences,
        periodCreditOccurrences,
        activeGoals,
        upcomingOccurrences,
        overdueOccurrences,
        recentPayments,
        transfers,
      ] = await Promise.all([
        db
          .select()
          .from(incomeOccurrences)
          .where(
            and(
              eq(incomeOccurrences.userId, user.id),
              gte(incomeOccurrences.expectedDate, periodStart),
              lte(incomeOccurrences.expectedDate, periodEnd),
              inArray(incomeOccurrences.status, ["pending", "received", "late"])
            )
          )
          .all(),

        db
          .select({
            occurrence: billOccurrences,
            bill: bills,
            category: categories,
          })
          .from(billOccurrences)
          .leftJoin(bills, eq(billOccurrences.billId, bills.id))
          .leftJoin(categories, eq(bills.categoryId, categories.id))
          .where(
            and(
              eq(billOccurrences.userId, user.id),
              gte(billOccurrences.dueDate, periodStart),
              lte(billOccurrences.dueDate, periodEnd),
              inArray(billOccurrences.status, ["pending", "partial", "paid", "overdue"]),
              eq(billOccurrences.hidden, false),
              eq(bills.hidden, false)
            )
          )
          .all(),

        db
          .select()
          .from(creditOccurrences)
          .where(
            and(
              eq(creditOccurrences.userId, user.id),
              or(
                and(
                  gte(creditOccurrences.receivedDate, periodStart),
                  lte(creditOccurrences.receivedDate, periodEnd)
                ),
                and(
                  gte(creditOccurrences.dueDate, periodStart),
                  lte(creditOccurrences.dueDate, periodEnd),
                  inArray(creditOccurrences.status, ["pending", "partial", "overdue"])
                )
              )
            )
          )
          .all(),

        db
          .select()
          .from(goals)
          .where(and(eq(goals.userId, user.id), eq(goals.isArchived, false)))
          .orderBy(asc(goals.sortOrder), asc(goals.name))
          .all(),

        db
          .select({
            occurrence: billOccurrences,
            bill: bills,
            vendor: vendors,
            category: categories,
          })
          .from(billOccurrences)
          .leftJoin(bills, eq(billOccurrences.billId, bills.id))
          .leftJoin(vendors, eq(bills.vendorId, vendors.id))
          .leftJoin(categories, eq(bills.categoryId, categories.id))
          .where(
            and(
              eq(billOccurrences.userId, user.id),
              gte(billOccurrences.dueDate, actualToday),
              lte(billOccurrences.dueDate, upcomingEnd),
              inArray(billOccurrences.status, ["pending", "partial"])
            )
          )
          .orderBy(asc(billOccurrences.dueDate))
          .limit(50)
          .all(),

        db
          .select({
            occurrence: billOccurrences,
            bill: bills,
          })
          .from(billOccurrences)
          .leftJoin(bills, eq(billOccurrences.billId, bills.id))
          .where(
            and(
              eq(billOccurrences.userId, user.id),
              lt(billOccurrences.dueDate, periodStart),
              inArray(billOccurrences.status, ["pending", "partial", "overdue"])
            )
          )
          .orderBy(asc(billOccurrences.dueDate))
          .limit(20)
          .all(),

        db
          .select({
            payment: billPayments,
            bill: bills,
            vendor: vendors,
            category: categories,
          })
          .from(billPayments)
          .innerJoin(
            billOccurrences,
            eq(billPayments.occurrenceId, billOccurrences.id)
          )
          .innerJoin(bills, eq(billOccurrences.billId, bills.id))
          .leftJoin(vendors, eq(bills.vendorId, vendors.id))
          .leftJoin(categories, eq(bills.categoryId, categories.id))
          .where(
            and(
              eq(billPayments.userId, user.id),
              gte(billPayments.paidDate, periodStart),
              lte(billPayments.paidDate, periodEnd <= actualToday ? periodEnd : actualToday),
              eq(billPayments.hidden, false),
              eq(bills.hidden, false)
            )
          )
          .orderBy(desc(billPayments.paidDate))
          .limit(10)
          .all(),
        db
          .select()
          .from(goalTransfers)
          .where(
            and(
              eq(goalTransfers.userId, user.id),
              lte(goalTransfers.transferDate, actualToday)
            )
          )
          .all(),
      ]);

      const totalMonthlyIncomeCents = periodIncomeOccurrences.reduce(
        (sum, o) => sum + (o.receivedAmountCents ?? o.amountCents),
        0
      );

      const totalMonthlyExpensesCents = periodBillOccurrences.reduce(
        (sum, r) => sum + r.occurrence.amountCents,
        0
      );

      const totalCreditsCents = periodCreditOccurrences.reduce(
        (sum, o) => sum + (o.receivedAmountCents ?? o.amountCents),
        0
      );

      const netBalanceCents = totalMonthlyIncomeCents + totalCreditsCents - totalMonthlyExpensesCents;
      const totalGoalAllocatedCents = transfers
        .filter((t) => t.transferDate >= periodStart && t.transferDate <= periodEnd)
        .reduce((sum, t) => {
          if (!t.fromGoalId && t.toGoalId) {
            return sum + t.amountCents;
          }
          if (t.fromGoalId && !t.toGoalId) {
            return sum - t.amountCents;
          }
          return sum;
        }, 0);
      const unallocatedCents = netBalanceCents - totalGoalAllocatedCents;

      const dashboardGoals = activeGoals.map((goal) => {
        const goalTransfersList = transfers.filter(
          (t) => (t.toGoalId === goal.id || t.fromGoalId === goal.id) &&
                 t.transferDate >= periodStart && t.transferDate <= periodEnd
        );
        const allocatedCents = goalTransfersList.reduce((sum, t) => {
          if (t.toGoalId === goal.id) return sum + t.amountCents;
          if (t.fromGoalId === goal.id) return sum - t.amountCents;
          return sum;
        }, 0);

        const remainingCents = goal.targetAmountCents - allocatedCents;
        const progressPercent = goal.targetAmountCents > 0
          ? Math.round((allocatedCents / goal.targetAmountCents) * 100)
          : 0;
        return {
          id: goal.id,
          name: goal.name,
          targetAmountCents: goal.targetAmountCents,
          allocatedCents,
          remainingCents,
          progressPercent,
        };
      });

      // Category breakdown from period bill occurrences
      const categoryMap = new Map<
        string,
        { name: string; color: string | null; totalCents: number }
      >();

      for (const { occurrence, bill, category } of periodBillOccurrences) {
        const key = bill?.categoryId ?? "__none__";
        const name = category?.name ?? "Uncategorized";
        const color = category?.color ?? null;
        const existing = categoryMap.get(key);
        if (existing) {
          existing.totalCents += occurrence.amountCents;
        } else {
          categoryMap.set(key, { name, color, totalCents: occurrence.amountCents });
        }
      }

      const categoryBreakdown = Array.from(categoryMap.entries()).map(
        ([categoryId, v]) => ({
          categoryId: categoryId === "__none__" ? null : categoryId,
          categoryName: v.name,
          color: v.color,
          totalCents: v.totalCents,
          percentage:
            totalMonthlyExpensesCents > 0
              ? Math.round((v.totalCents / totalMonthlyExpensesCents) * 100)
              : 0,
        })
      );

      return {
        periodLabel,
        totalMonthlyIncomeCents,
        totalMonthlyExpensesCents,
        totalCreditsCents,
        netBalanceCents,
        unallocatedCents,
        totalGoalAllocatedCents,
        goals: dashboardGoals,
        upcomingBills: upcomingOccurrences.map((r) => ({
          id: r.occurrence.id,
          billId: r.occurrence.billId,
          billName: r.bill?.name ?? "Unknown",
          vendorName: r.vendor?.name ?? null,
          categoryName: r.category?.name ?? null,
          categoryColor: r.category?.color ?? null,
          dueDate: r.occurrence.dueDate,
          amountCents: r.occurrence.amountCents,
          paidAmountCents: r.occurrence.paidAmountCents,
          carriedFromId: r.occurrence.carriedFromId,
          status: r.occurrence.status,
          hidden: r.occurrence.hidden || (r.bill?.hidden ?? false),
        })),
        overdueBills: overdueOccurrences.map((r) => ({
          id: r.occurrence.id,
          billId: r.occurrence.billId,
          billName: r.bill?.name ?? "Unknown",
          dueDate: r.occurrence.dueDate,
          amountCents: r.occurrence.amountCents,
          paidAmountCents: r.occurrence.paidAmountCents ?? 0,
          status: r.occurrence.status,
          hidden: r.occurrence.hidden || (r.bill?.hidden ?? false),
        })),
        recentPayments: recentPayments.map((r) => ({
          id: r.payment.id,
          billId: r.bill?.id ?? "",
          billName: r.bill?.name ?? "Unknown",
          paidDate: r.payment.paidDate,
          paidAmountCents: r.payment.amountCents,
          vendorName: r.vendor?.name ?? null,
          categoryColor: r.category?.color ?? null,
        })),
        categoryBreakdown,
      };
    });
  });
