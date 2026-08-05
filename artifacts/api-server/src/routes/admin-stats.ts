import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  paymentTransactionsTable,
  tryoutSessionsTable,
  userSubscriptionsTable,
} from "@workspace/db";
import { eq, gte, sql, desc, and } from "drizzle-orm";

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Tidak terautentikasi." });
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u || u.role !== "admin") return res.status(403).json({ error: "Akses ditolak." });
  next();
}

const router = Router();

/* ------------------------------------------------------------------ */
/* GET /api/admin/stats                                                 */
/* ------------------------------------------------------------------ */
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const now = new Date();

  // Build last 7 months labels
  const months: { label: string; year: number; month: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("id-ID", { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1, // 1-based
    });
  }

  const sevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [
    totalUsersResult,
    activeSubsResult,
    totalRevenueResult,
    completedTryoutsResult,
    monthlyRevenueRaw,
    newUsersRaw,
    recentPayments,
    subsDistribution,
  ] = await Promise.all([
    // Total users (exclude admin)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.role, "participant")),

    // Active subscriptions
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userSubscriptionsTable)
      .where(
        and(
          eq(userSubscriptionsTable.status, "active"),
          gte(userSubscriptionsTable.expiresAt, now),
        ),
      ),

    // Total revenue (success transactions)
    db
      .select({ total: sql<number>`coalesce(sum(amount), 0)::bigint` })
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.status, "success")),

    // Completed tryouts
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tryoutSessionsTable)
      .where(eq(tryoutSessionsTable.status, "submitted")),

    // Monthly revenue (last 7 months)
    db
      .select({
        year:   sql<number>`extract(year from created_at)::int`,
        month:  sql<number>`extract(month from created_at)::int`,
        amount: sql<number>`coalesce(sum(amount), 0)::bigint`,
      })
      .from(paymentTransactionsTable)
      .where(
        and(
          eq(paymentTransactionsTable.status, "success"),
          gte(paymentTransactionsTable.createdAt, sevenMonthsAgo),
        ),
      )
      .groupBy(
        sql`extract(year from created_at)`,
        sql`extract(month from created_at)`,
      ),

    // New users per month (last 7 months, exclude admin)
    db
      .select({
        year:  sql<number>`extract(year from created_at)::int`,
        month: sql<number>`extract(month from created_at)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.role, "participant"),
          gte(usersTable.createdAt, sevenMonthsAgo),
        ),
      )
      .groupBy(
        sql`extract(year from created_at)`,
        sql`extract(month from created_at)`,
      ),

    // Recent 5 payments
    db
      .select({
        id:              paymentTransactionsTable.id,
        merchantOrderId: paymentTransactionsTable.merchantOrderId,
        planName:        paymentTransactionsTable.planName,
        amount:          paymentTransactionsTable.amount,
        status:          paymentTransactionsTable.status,
        createdAt:       paymentTransactionsTable.createdAt,
        userFullName:    usersTable.fullName,
        userEmail:       usersTable.email,
      })
      .from(paymentTransactionsTable)
      .leftJoin(usersTable, eq(paymentTransactionsTable.userId, usersTable.id))
      .orderBy(desc(paymentTransactionsTable.createdAt))
      .limit(5),

    // Subscription distribution by plan
    db
      .select({
        planName: userSubscriptionsTable.planName,
        count: sql<number>`count(*)::int`,
      })
      .from(userSubscriptionsTable)
      .where(
        and(
          eq(userSubscriptionsTable.status, "active"),
          gte(userSubscriptionsTable.expiresAt, now),
        ),
      )
      .groupBy(userSubscriptionsTable.planName),
  ]);

  // Map monthly revenue to labeled array
  const revenueMap = new Map(
    monthlyRevenueRaw.map((r) => [`${r.year}-${r.month}`, Number(r.amount)]),
  );
  const usersMap = new Map(
    newUsersRaw.map((r) => [`${r.year}-${r.month}`, r.count]),
  );

  const monthlyRevenue = months.map((m) => ({
    month: m.label,
    amount: revenueMap.get(`${m.year}-${m.month}`) ?? 0,
  }));

  const newUsers = months.map((m) => ({
    month: m.label,
    count: usersMap.get(`${m.year}-${m.month}`) ?? 0,
  }));

  return res.json({
    totals: {
      users:            totalUsersResult[0]?.count ?? 0,
      activeUsers:      activeSubsResult[0]?.count ?? 0,
      revenue:          Number(totalRevenueResult[0]?.total ?? 0),
      completedTryouts: completedTryoutsResult[0]?.count ?? 0,
    },
    monthlyRevenue,
    newUsers,
    recentPayments,
    subsDistribution,
  });
});

export default router;
