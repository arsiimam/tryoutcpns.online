/**
 * Admin: Payment Transactions
 * Mounted at /api/admin/transactions
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, paymentTransactionsTable, subscriptionPlansTable } from "@workspace/db";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { activateOrExtendSubscription } from "../lib/subscription-helper";

const router = Router();

/* ------------------------------------------------------------------ */
/* Auth guard                                                           */
/* ------------------------------------------------------------------ */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Tidak terautentikasi." });
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u || u.role !== "admin") return res.status(403).json({ error: "Akses ditolak." });
  next();
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/transactions                                          */
/* Query params: status, search, page, limit                           */
/* ------------------------------------------------------------------ */
router.get("/admin/transactions", requireAdmin, async (req, res) => {
  const status  = (req.query.status  as string) || "";
  const search  = (req.query.search  as string) || "";
  const page    = Math.max(1, Number(req.query.page)  || 1);
  const limit   = Math.min(100, Number(req.query.limit) || 20);
  const offset  = (page - 1) * limit;

  // Build where clause
  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(paymentTransactionsTable.status, status));

  // Join with users to get name/email
  const rows = await db
    .select({
      tx: paymentTransactionsTable,
      userName:  usersTable.fullName,
      userEmail: usersTable.email,
    })
    .from(paymentTransactionsTable)
    .leftJoin(usersTable, eq(paymentTransactionsTable.userId, usersTable.id))
    .where(
      conditions.length === 0
        ? undefined
        : conditions[0]
    )
    .orderBy(desc(paymentTransactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Count total (for pagination)
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentTransactionsTable)
    .where(conditions.length === 0 ? undefined : conditions[0]);

  // Filter by search (merchant order ID, plan name, user name) in JS
  // (simpler than dynamic SQL for now)
  let results = rows.map(r => ({
    ...r.tx,
    userName:  r.userName,
    userEmail: r.userEmail,
  }));

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(r =>
      r.merchantOrderId.toLowerCase().includes(q) ||
      r.planName.toLowerCase().includes(q) ||
      (r.userName ?? "").toLowerCase().includes(q) ||
      (r.userEmail ?? "").toLowerCase().includes(q)
    );
  }

  return res.json({
    transactions: results,
    pagination: { page, limit, total: Number(count) },
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/admin/transactions/stats  ← must be BEFORE /:id            */
/* ------------------------------------------------------------------ */
router.get("/admin/transactions/stats", requireAdmin, async (_req, res) => {
  const stats = await db
    .select({
      status: paymentTransactionsTable.status,
      count:  sql<number>`count(*)::int`,
      total:  sql<number>`coalesce(sum(${paymentTransactionsTable.amount}), 0)::int`,
    })
    .from(paymentTransactionsTable)
    .groupBy(paymentTransactionsTable.status);

  return res.json({ stats });
});

/* ------------------------------------------------------------------ */
/* GET /api/admin/transactions/:id                                      */
/* ------------------------------------------------------------------ */
router.get("/admin/transactions/:id", requireAdmin, async (req, res) => {
  const [row] = await db
    .select({
      tx: paymentTransactionsTable,
      userName:  usersTable.fullName,
      userEmail: usersTable.email,
    })
    .from(paymentTransactionsTable)
    .leftJoin(usersTable, eq(paymentTransactionsTable.userId, usersTable.id))
    .where(eq(paymentTransactionsTable.id, req.params.id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Transaksi tidak ditemukan." });
  return res.json({ ...row.tx, userName: row.userName, userEmail: row.userEmail });
});

/* ------------------------------------------------------------------ */
/* PUT /api/admin/transactions/:id/status                               */
/* Body: { status: "success" | "failed" | "cancelled" | "expired" }   */
/* Jika status diubah ke "success", otomatis aktifkan langganan user.  */
/* ------------------------------------------------------------------ */
router.put("/admin/transactions/:id/status", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const allowed = ["pending", "success", "failed", "expired", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status tidak valid. Gunakan: ${allowed.join(", ")}` });
  }

  const [tx] = await db
    .update(paymentTransactionsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(paymentTransactionsTable.id, id))
    .returning();

  if (!tx) return res.status(404).json({ error: "Transaksi tidak ditemukan." });

  // Jika admin konfirmasi sebagai sukses → aktifkan/perpanjang langganan
  if (status === "success" && tx.userId) {
    let durationDays = 30;
    try {
      const [plan] = await db
        .select({ durationDays: subscriptionPlansTable.durationDays })
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, tx.planId))
        .limit(1);
      if (plan?.durationDays) durationDays = plan.durationDays;
    } catch { /* pakai default 30 hari */ }

    await activateOrExtendSubscription({
      userId: tx.userId, planId: tx.planId, planName: tx.planName, durationDays,
    });
  }

  return res.json({ ok: true, transaction: tx });
});

export default router;
