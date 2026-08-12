import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { userSubscriptionsTable, paymentTransactionsTable, appSettingsTable, userNotificationsTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, gt, count } from "drizzle-orm";

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
 * GET /participant/notifications — list notifications for the logged-in user
 */
router.get("/participant/notifications", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select({
        id:             userNotificationsTable.id,
        notificationId: userNotificationsTable.notificationId,
        isRead:         userNotificationsTable.isRead,
        readAt:         userNotificationsTable.readAt,
        createdAt:      userNotificationsTable.createdAt,
        title:          notificationsTable.title,
        body:           notificationsTable.body,
        sentAt:         notificationsTable.createdAt,
      })
      .from(userNotificationsTable)
      .innerJoin(notificationsTable, eq(userNotificationsTable.notificationId, notificationsTable.id))
      .where(eq(userNotificationsTable.userId, req.session.userId!))
      .orderBy(desc(userNotificationsTable.createdAt))
      .limit(50);

    const [{ unreadCount }] = await db
      .select({ unreadCount: count() })
      .from(userNotificationsTable)
      .where(and(
        eq(userNotificationsTable.userId, req.session.userId!),
        eq(userNotificationsTable.isRead, false),
      ));

    return res.json({ notifications: rows, unreadCount: Number(unreadCount) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /participant/notifications/:id/read — mark one notification as read
 */
router.patch("/participant/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await db
      .update(userNotificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(userNotificationsTable.id, req.params.id),
        eq(userNotificationsTable.userId, req.session.userId!),
      ));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /participant/notifications/read-all — mark all as read
 */
router.patch("/participant/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db
      .update(userNotificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(userNotificationsTable.userId, req.session.userId!),
        eq(userNotificationsTable.isRead, false),
      ));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
