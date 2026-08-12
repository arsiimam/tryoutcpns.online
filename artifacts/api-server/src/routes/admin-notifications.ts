import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  notificationsTable,
  userNotificationsTable,
  usersTable,
  userSubscriptionsTable,
} from "@workspace/db";
import { eq, and, gt, lt, notInArray, desc, count } from "drizzle-orm";

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}
router.use(requireAdmin);

/**
 * GET /admin/notifications — list sent notifications with recipient count
 */
router.get("/admin/notifications", async (_req, res) => {
  try {
    const notifs = await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);

    // Count recipients per notification
    const counts = await db
      .select({
        notificationId: userNotificationsTable.notificationId,
        total: count(userNotificationsTable.id),
      })
      .from(userNotificationsTable)
      .groupBy(userNotificationsTable.notificationId);

    const countMap = new Map(counts.map((c) => [c.notificationId, Number(c.total)]));

    const result = notifs.map((n) => ({
      ...n,
      recipientCount: countMap.get(n.id) ?? 0,
    }));

    return res.json({ notifications: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/notifications — create & fan-out to target users
 * Body: { title, body, filterType: 'all'|'free'|'premium'|'expiring' }
 */
router.post("/admin/notifications", async (req, res) => {
  try {
    const { title, body, filterType } = req.body as {
      title: string;
      body: string;
      filterType: "all" | "free" | "premium" | "expiring";
    };

    if (!title?.trim() || !body?.trim())
      return res.status(400).json({ error: "Judul dan pesan wajib diisi." });
    if (!["all", "free", "premium", "expiring"].includes(filterType))
      return res.status(400).json({ error: "filterType tidak valid." });

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Determine target user IDs based on filter
    let targetUserIds: string[] = [];

    if (filterType === "all") {
      const users = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.role, "participant"));
      targetUserIds = users.map((u) => u.id);
    } else if (filterType === "premium") {
      // Users with active subscription not expiring within 7 days
      const subs = await db
        .select({ userId: userSubscriptionsTable.userId })
        .from(userSubscriptionsTable)
        .where(
          and(
            eq(userSubscriptionsTable.status, "active"),
            gt(userSubscriptionsTable.expiresAt, now),
          ),
        );
      targetUserIds = [...new Set(subs.map((s) => s.userId))];
    } else if (filterType === "expiring") {
      // Active subscriptions expiring within 7 days
      const subs = await db
        .select({ userId: userSubscriptionsTable.userId })
        .from(userSubscriptionsTable)
        .where(
          and(
            eq(userSubscriptionsTable.status, "active"),
            gt(userSubscriptionsTable.expiresAt, now),
            lt(userSubscriptionsTable.expiresAt, sevenDaysLater),
          ),
        );
      targetUserIds = [...new Set(subs.map((s) => s.userId))];
    } else {
      // free: participants with NO active subscription
      const subsWithActive = await db
        .select({ userId: userSubscriptionsTable.userId })
        .from(userSubscriptionsTable)
        .where(
          and(
            eq(userSubscriptionsTable.status, "active"),
            gt(userSubscriptionsTable.expiresAt, now),
          ),
        );
      const premiumIds = subsWithActive.map((s) => s.userId);

      const query = db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.role, "participant"));

      const allParticipants = await query;
      targetUserIds = allParticipants
        .map((u) => u.id)
        .filter((id) => !premiumIds.includes(id));
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: "Tidak ada user yang sesuai filter." });
    }

    // 2. Insert notification record
    const [notif] = await db
      .insert(notificationsTable)
      .values({
        title: title.trim(),
        body: body.trim(),
        filterType,
        createdBy: req.session.userId!,
      })
      .returning();

    // 3. Fan-out: insert user_notifications in batches
    const BATCH = 500;
    for (let i = 0; i < targetUserIds.length; i += BATCH) {
      const batch = targetUserIds.slice(i, i + BATCH);
      await db.insert(userNotificationsTable).values(
        batch.map((uid) => ({
          notificationId: notif.id,
          userId: uid,
        })),
      );
    }

    return res.json({ ok: true, notificationId: notif.id, recipientCount: targetUserIds.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
