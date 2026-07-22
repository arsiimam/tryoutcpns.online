import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, appSettingsTable, userSubscriptionsTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { invalidateGoogleCredCache } from "./auth";

const router = Router();

/* ------------------------------------------------------------------ */
/* Middleware — require authenticated admin                             */
/* ------------------------------------------------------------------ */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Tidak terautentikasi." });

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Akses ditolak." });
  }
  next();
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/settings                                             */
/* ------------------------------------------------------------------ */
router.get("/admin/settings", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const dbClientId = map["google_client_id"] ?? "";
  const dbClientSecret = map["google_client_secret"] ?? "";

  // Effective values (DB wins; fallback to env)
  const clientId = dbClientId || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = dbClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";

  // Mask the secret for the response
  function maskSecret(s: string) {
    if (!s) return "";
    if (s.length <= 8) return "*".repeat(s.length);
    return s.slice(0, 4) + "*".repeat(s.length - 8) + s.slice(-4);
  }

  return res.json({
    google_client_id: clientId,
    google_client_secret_masked: maskSecret(clientSecret),
    google_client_secret_source: dbClientSecret
      ? "database"
      : process.env.GOOGLE_CLIENT_SECRET
        ? "environment"
        : "none",
  });
});

/* ------------------------------------------------------------------ */
/* PUT /api/admin/settings                                             */
/* ------------------------------------------------------------------ */
router.put("/admin/settings", requireAdmin, async (req, res) => {
  const body = req.body as {
    google_client_id?: string;
    google_client_secret?: string;
  };

  const updates: { key: string; value: string }[] = [];

  if (typeof body.google_client_id === "string") {
    updates.push({ key: "google_client_id", value: body.google_client_id.trim() });
  }
  // Only update secret if a non-empty value was sent
  if (typeof body.google_client_secret === "string" && body.google_client_secret.trim() !== "") {
    updates.push({ key: "google_client_secret", value: body.google_client_secret.trim() });
  }

  for (const u of updates) {
    await db
      .insert(appSettingsTable)
      .values({ key: u.key, value: u.value })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value: u.value, updatedAt: new Date() },
      });
  }

  // Bust the in-memory credential cache in auth.ts
  invalidateGoogleCredCache();

  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* GET /api/admin/users                                                */
/* ------------------------------------------------------------------ */
router.get("/admin/users", requireAdmin, async (_req, res) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const userIds = users.map((u) => u.id);

  // Fetch latest subscription per user (ordered desc so first hit = latest)
  const subs =
    userIds.length > 0
      ? await db
          .select()
          .from(userSubscriptionsTable)
          .where(inArray(userSubscriptionsTable.userId, userIds))
          .orderBy(desc(userSubscriptionsTable.createdAt))
      : [];

  // Keep only the latest subscription per userId
  const latestSub = new Map<string, typeof subs[0]>();
  for (const s of subs) {
    if (!latestSub.has(s.userId)) latestSub.set(s.userId, s);
  }

  const result = users.map((u) => {
    const sub = latestSub.get(u.id) ?? null;
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      authProvider: u.authProvider,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      subscription: sub
        ? {
            planId: sub.planId,
            planName: sub.planName,
            status: sub.status,
            startedAt: sub.startedAt,
            expiresAt: sub.expiresAt,
          }
        : null,
    };
  });

  return res.json({ users: result });
});

/* ------------------------------------------------------------------ */
/* POST /api/admin/users/:id/subscription                             */
/* Manually assign / update a subscription for a user                 */
/* ------------------------------------------------------------------ */
router.post("/admin/users/:id/subscription", requireAdmin, async (req, res) => {
  const { id: userId } = req.params;
  const { planId, planName, durationDays } = req.body as {
    planId: string;
    planName: string;
    durationDays: number;
  };

  if (!planId || !planName || !durationDays) {
    return res.status(400).json({ error: "planId, planName, dan durationDays diperlukan." });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await db.insert(userSubscriptionsTable).values({
    userId,
    planId,
    planName,
    status: "active",
    startedAt: now,
    expiresAt,
  });

  return res.json({ ok: true, expiresAt });
});

export default router;
