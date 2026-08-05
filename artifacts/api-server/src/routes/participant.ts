import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { userSubscriptionsTable, paymentTransactionsTable, appSettingsTable } from "@workspace/db";
import { eq, desc, and, gt } from "drizzle-orm";

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: "Login diperlukan." });
  next();
}

/**
 * GET /participant/subscription  — active subscription of the logged-in user
 */
router.get("/participant/subscription", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const [sub] = await db
      .select()
      .from(userSubscriptionsTable)
      .where(
        and(
          eq(userSubscriptionsTable.userId, req.session.userId!),
          eq(userSubscriptionsTable.status, "active"),
          gt(userSubscriptionsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(userSubscriptionsTable.startedAt))
      .limit(1);

    if (!sub) return res.json({ subscription: null });

    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(sub.expiresAt).getTime() - now.getTime()) / 86_400_000),
    );

    res.json({
      subscription: {
        id:        sub.id,
        planId:    sub.planId,
        planName:  sub.planName,
        status:    sub.status,
        startedAt: sub.startedAt,
        expiresAt: sub.expiresAt,
        daysLeft,
      },
    });
  } catch {
    res.status(500).json({ error: "Gagal mengambil data langganan." });
  }
});

/**
 * GET /participant/transactions  — payment history of the logged-in user
 */
router.get("/participant/transactions", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.userId, req.session.userId!))
      .orderBy(desc(paymentTransactionsTable.createdAt))
      .limit(50);

    res.json({ transactions: rows });
  } catch {
    res.status(500).json({ error: "Gagal mengambil riwayat transaksi." });
  }
});

/**
 * GET /participant/settings/passing-grades — passing grades visible to logged-in participants
 */
router.get("/participant/settings/passing-grades", requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "passing_grades"));
    const raw = rows[0]?.value ?? null;
    let grades: Record<string, number> = { TWK: 65, TIU: 80, TKP: 166 };
    if (raw) {
      try { grades = { ...grades, ...JSON.parse(raw) }; } catch {}
    }
    return res.json({ grades });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
