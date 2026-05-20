import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, gte, lte, lt, desc, asc, inArray } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { bills } from "~/db/schema/bills";
import { incomeSources } from "~/db/schema/income-sources";
import { billOccurrences } from "~/db/schema/bill-occurrences";
import { billPayments } from "~/db/schema/bill-payments";
import { incomeOccurrences } from "~/db/schema/income-occurrences";
import { vendors } from "~/db/schema/vendors";
import { categories } from "~/db/schema/categories";
import { normalizeToMonthlyCents, type BillInterval } from "~/lib/currency";
import { getCachedOrFetch, dashboardCacheKey } from "~/lib/kv-cache";
import { toDateStr } from "~/lib/dates";
import { addDays, addMonths, startOfMonth, endOfMonth, format } from "date-fns";

export type DashboardData = {
  totalMonthlyIncomeCents: number;
  totalMonthlyExpensesCents: number;
  netBalanceCents: number;
  unallocatedCents: number;
  upcomingBills: Array<{
    id: string;
    billId: string;
    billName: string;
    vendorName: string | null;
    categoryName: string | null;
    categoryColor: string | null;
    dueDate: string;
    amountCents: number;
    status: string;
  }>;
  overdueBills: Array<{
    id: string;
    billId: string;
    billName: string;
    dueDate: string;
    amountCents: number;
  }>;
  recentPayments: Array<{
    id: string;
    billName: string;
    paidDate: string;
    paidAmountCents: number;
    vendorName: string | null;
  }>;
  categoryBreakdown: Array<{
    categoryId: string | null;
    categoryName: string;
    color: string | null;
    totalCents: number;
    percentage: number;
  }>;
};

export type TrendPeriod = 1 | 3 | 6 | 12;

export type TrendDataPoint = {
  month: string;
  incomeCents: number;
  expensesCents: number;
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
      referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  )
  .handler(async ({ data, context }): Promise<DashboardData> => {
    const { db, user, env } = context;
    const reference = data.referenceDate ?? toDateStr(new Date());
    const actualToday = toDateStr(new Date());
    const effectiveUpcomingStart = reference > actualToday ? reference : actualToday;
    const upcomingEnd = toDateStr(
      addDays(new Date(`${effectiveUpcomingStart}T00:00:00`), data.upcomingDays)
    );
    const recentStart = toDateStr(
      addDays(new Date(`${reference}T00:00:00`), -30)
    );
    const period = reference.slice(0, 7);
    const cacheKey = dashboardCacheKey(
      user.id,
      `${period}-${reference}-${actualToday}-${data.upcomingDays}`
    );

    return getCachedOrFetch(env.KV, cacheKey, 300, async () => {
      const [
        activeBills,
        activeIncomeSources,
        upcomingOccurrences,
        overdueOccurrences,
        recentPayments,
      ] = await Promise.all([
        db
          .select({
            bill: bills,
            category: categories,
          })
          .from(bills)
          .leftJoin(categories, eq(bills.categoryId, categories.id))
          .where(and(eq(bills.userId, user.id), eq(bills.isActive, true)))
          .all(),

        db
          .select()
          .from(incomeSources)
          .where(
            and(
              eq(incomeSources.userId, user.id),
              eq(incomeSources.isActive, true)
            )
          )
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
              gte(billOccurrences.dueDate, effectiveUpcomingStart),
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
              lt(billOccurrences.dueDate, actualToday),
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
          })
          .from(billPayments)
          .innerJoin(
            billOccurrences,
            eq(billPayments.occurrenceId, billOccurrences.id)
          )
          .innerJoin(bills, eq(billOccurrences.billId, bills.id))
          .leftJoin(vendors, eq(bills.vendorId, vendors.id))
          .where(
            and(
              eq(billPayments.userId, user.id),
              gte(billPayments.paidDate, recentStart),
              lte(billPayments.paidDate, reference)
            )
          )
          .orderBy(desc(billPayments.paidDate))
          .limit(10)
          .all(),
      ]);

      // Normalize to monthly
      const totalMonthlyIncomeCents = activeIncomeSources.reduce(
        (sum, s) =>
          sum +
          normalizeToMonthlyCents(
            s.amountCents,
            s.interval as BillInterval
          ),
        0
      );

      const totalMonthlyExpensesCents = activeBills.reduce(
        (sum, b) =>
          sum +
          normalizeToMonthlyCents(
            b.bill.amountCents,
            b.bill.interval as BillInterval
          ),
        0
      );

      const netBalanceCents = totalMonthlyIncomeCents - totalMonthlyExpensesCents;
      const unallocatedCents = netBalanceCents;

      // Category breakdown
      const categoryMap = new Map<
        string,
        { name: string; color: string | null; totalCents: number }
      >();

      for (const { bill, category } of activeBills) {
        const key = bill.categoryId ?? "__none__";
        const name = category?.name ?? "Uncategorized";
        const color = category?.color ?? null;
        const monthlyCents = normalizeToMonthlyCents(
          bill.amountCents,
          bill.interval as BillInterval
        );
        const existing = categoryMap.get(key);
        if (existing) {
          existing.totalCents += monthlyCents;
        } else {
          categoryMap.set(key, { name, color, totalCents: monthlyCents });
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
        totalMonthlyIncomeCents,
        totalMonthlyExpensesCents,
        netBalanceCents,
        unallocatedCents,
        upcomingBills: upcomingOccurrences.map((r) => ({
          id: r.occurrence.id,
          billId: r.occurrence.billId,
          billName: r.bill?.name ?? "Unknown",
          vendorName: r.vendor?.name ?? null,
          categoryName: r.category?.name ?? null,
          categoryColor: r.category?.color ?? null,
          dueDate: r.occurrence.dueDate,
          amountCents: r.occurrence.amountCents,
          status: r.occurrence.status,
        })),
        overdueBills: overdueOccurrences.map((r) => ({
          id: r.occurrence.id,
          billId: r.occurrence.billId,
          billName: r.bill?.name ?? "Unknown",
          dueDate: r.occurrence.dueDate,
          amountCents: r.occurrence.amountCents,
        })),
        recentPayments: recentPayments.map((r) => ({
          id: r.payment.id,
          billName: r.bill?.name ?? "Unknown",
          paidDate: r.payment.paidDate,
          paidAmountCents: r.payment.amountCents,
          vendorName: r.vendor?.name ?? null,
        })),
        categoryBreakdown,
      };
    });
  });

export const getTrendData = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      months: z.union([
        z.literal(1),
        z.literal(3),
        z.literal(6),
        z.literal(12),
      ]).default(1),
    })
  )
  .handler(async ({ data, context }): Promise<TrendDataPoint[]> => {
    const { db, user } = context;
    const trend: TrendDataPoint[] = [];

    for (let i = data.months - 1; i >= 0; i--) {
      const monthDate = addMonths(new Date(), -i);
      const monthStart = toDateStr(startOfMonth(monthDate));
      const monthEnd = toDateStr(endOfMonth(monthDate));
      const monthLabel = data.months <= 3
        ? format(monthDate, "MMM yyyy")
        : format(monthDate, "MMM yy");

      const [billPaid, incomeReceived] = await Promise.all([
        db
          .select({ paidCents: billOccurrences.paidAmountCents, baseCents: billOccurrences.amountCents })
          .from(billOccurrences)
          .where(
            and(
              eq(billOccurrences.userId, user.id),
              eq(billOccurrences.status, "paid"),
              gte(billOccurrences.paidDate, monthStart),
              lte(billOccurrences.paidDate, monthEnd)
            )
          )
          .all(),

        db
          .select({ receivedCents: incomeOccurrences.receivedAmountCents, baseCents: incomeOccurrences.amountCents })
          .from(incomeOccurrences)
          .where(
            and(
              eq(incomeOccurrences.userId, user.id),
              eq(incomeOccurrences.status, "received"),
              gte(incomeOccurrences.receivedDate, monthStart),
              lte(incomeOccurrences.receivedDate, monthEnd)
            )
          )
          .all(),
      ]);

      trend.push({
        month: monthLabel,
        expensesCents: billPaid.reduce(
          (sum, r) => sum + (r.paidCents ?? r.baseCents),
          0
        ),
        incomeCents: incomeReceived.reduce(
          (sum, r) => sum + (r.receivedCents ?? r.baseCents),
          0
        ),
      });
    }

    return trend;
  });
