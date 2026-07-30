import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, appSettingsTable, userSubscriptionsTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { invalidateGoogleCredCache } from "./auth";
import { invalidateDuitkuCredCache } from "../lib/duitku";

const router = Router();

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
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
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function maskSecret(s: string): string {
  if (!s) return "";
  if (s.length <= 8) return "*".repeat(s.length);
  return s.slice(0, 4) + "*".repeat(s.length - 8) + s.slice(-4);
}

async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

async function upsertSetting(key: string, value: string) {
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/settings                                             */
/* ------------------------------------------------------------------ */
router.get("/admin/settings", requireAdmin, async (_req, res) => {
  const map = await getAllSettings();

  // ---- Google OAuth ----
  const dbClientId     = map["google_client_id"]     ?? "";
  const dbClientSecret = map["google_client_secret"] ?? "";
  const clientId       = dbClientId     || process.env.GOOGLE_CLIENT_ID     || "";
  const clientSecret   = dbClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";

  // ---- Duitku ----
  const dbMerchantCode  = map["duitku_merchant_code"]  ?? "";
  const dbApiKey        = map["duitku_api_key"]         ?? "";
  const dbEnvironment   = map["duitku_environment"]     ?? "";
  const dbExpiryPeriod  = map["duitku_expiry_period"]   ?? "";

  const merchantCode  = dbMerchantCode || process.env.DUITKU_MERCHANT_CODE || "";
  const apiKey        = dbApiKey       || process.env.DUITKU_API_KEY        || "";
  const environment   = dbEnvironment  || process.env.DUITKU_ENV            || "sandbox";
  const expiryPeriod  = dbExpiryPeriod || "1440";

  return res.json({
    /* Google */
    google_client_id:              clientId,
    google_client_secret_masked:   maskSecret(clientSecret),
    google_client_secret_source:   dbClientSecret
      ? "database" : process.env.GOOGLE_CLIENT_SECRET ? "environment" : "none",

    /* Duitku */
    duitku_merchant_code:          merchantCode,
    duitku_api_key_masked:         maskSecret(apiKey),
    duitku_api_key_source:         dbApiKey
      ? "database" : process.env.DUITKU_API_KEY ? "environment" : "none",
    duitku_environment:            environment === "production" ? "production" : "sandbox",
    duitku_expiry_period:          expiryPeriod,
    duitku_merchant_code_source:   dbMerchantCode
      ? "database" : process.env.DUITKU_MERCHANT_CODE ? "environment" : "none",
  });
});

/* ------------------------------------------------------------------ */
/* PUT /api/admin/settings                                             */
/* ------------------------------------------------------------------ */
router.put("/admin/settings", requireAdmin, async (req, res) => {
  const body = req.body as {
    /* Google */
    google_client_id?:     string;
    google_client_secret?: string;
    /* Duitku */
    duitku_merchant_code?: string;
    duitku_api_key?:       string;
    duitku_environment?:   string;
    duitku_expiry_period?: string;
  };

  let googleChanged = false;
  let duitkuChanged = false;

  // ---- Google ----
  if (typeof body.google_client_id === "string") {
    await upsertSetting("google_client_id", body.google_client_id.trim());
    googleChanged = true;
  }
  if (typeof body.google_client_secret === "string" && body.google_client_secret.trim()) {
    await upsertSetting("google_client_secret", body.google_client_secret.trim());
    googleChanged = true;
  }

  // ---- Duitku ----
  if (typeof body.duitku_merchant_code === "string") {
    await upsertSetting("duitku_merchant_code", body.duitku_merchant_code.trim());
    duitkuChanged = true;
  }
  if (typeof body.duitku_api_key === "string" && body.duitku_api_key.trim()) {
    await upsertSetting("duitku_api_key", body.duitku_api_key.trim());
    duitkuChanged = true;
  }
  if (typeof body.duitku_environment === "string") {
    const env = body.duitku_environment === "production" ? "production" : "sandbox";
    await upsertSetting("duitku_environment", env);
    duitkuChanged = true;
  }
  if (typeof body.duitku_expiry_period === "string") {
    const mins = Math.max(5, Math.min(10080, Number(body.duitku_expiry_period) || 1440));
    await upsertSetting("duitku_expiry_period", String(mins));
    duitkuChanged = true;
  }

  if (googleChanged) invalidateGoogleCredCache();
  if (duitkuChanged) invalidateDuitkuCredCache();

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

  const subs =
    userIds.length > 0
      ? await db
          .select()
          .from(userSubscriptionsTable)
          .where(inArray(userSubscriptionsTable.userId, userIds))
          .orderBy(desc(userSubscriptionsTable.createdAt))
      : [];

  const latestSub = new Map<string, (typeof subs)[0]>();
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
            planId:    sub.planId,
            planName:  sub.planName,
            status:    sub.status,
            startedAt: sub.startedAt,
            expiresAt: sub.expiresAt,
          }
        : null,
    };
  });

  return res.json({ users: result });
});

/* ------------------------------------------------------------------ */
/* POST /api/admin/users/:id/subscription                              */
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

  const now      = new Date();
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
