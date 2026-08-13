import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, appSettingsTable, userSubscriptionsTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { invalidateGoogleCredCache } from "./auth";
import { invalidateDuitkuCredCache } from "../lib/duitku";
import { invalidateMidtransCache, invalidateGatewayCache } from "../lib/midtrans";
import { regenerateDummyScores, totalDummyCount, computeStats, buildScoreArray, DUMMY_N, DUMMY_MEAN, DUMMY_STD, DUMMY_SEED } from "../lib/dummy-scores";

const router = Router();

/* ------------------------------------------------------------------ */
/* GET /api/site-config — public endpoint for landing page             */
/* Returns social links and other public site settings                 */
/* ------------------------------------------------------------------ */
router.get("/site-config", async (_req, res) => {
  try {
    const map = await getAllSettings();
    return res.json({
      social_instagram: map["social_instagram"] ?? "",
      social_tiktok:    map["social_tiktok"]    ?? "",
      social_telegram:  map["social_telegram"]  ?? "",
      social_facebook:  map["social_facebook"]  ?? "",
    });
  } catch {
    return res.json({ social_instagram: "", social_tiktok: "", social_telegram: "", social_facebook: "" });
  }
});

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
  const updated = await db
    .update(appSettingsTable)
    .set({ value, updatedAt: new Date() })
    .where(eq(appSettingsTable.key, key))
    .returning({ id: appSettingsTable.id });

  if (updated.length === 0) {
    await db.insert(appSettingsTable).values({ key, value });
  }
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

  // ---- Midtrans ----
  const dbMtServerKey  = map["midtrans_server_key"]   ?? "";
  const dbMtClientKey  = map["midtrans_client_key"]   ?? "";
  const dbMtEnv        = map["midtrans_environment"]  ?? "";

  const mtServerKey = dbMtServerKey || process.env.MIDTRANS_SERVER_KEY || "";
  const mtClientKey = dbMtClientKey || process.env.MIDTRANS_CLIENT_KEY || "";
  const mtEnv       = dbMtEnv       || "sandbox";

  // ---- Active gateway ----
  const activeGateway = (map["active_payment_gateway"] === "midtrans") ? "midtrans" : "duitku";

  // ---- Social links ----
  const socialInstagram = map["social_instagram"] ?? "";
  const socialTiktok    = map["social_tiktok"]    ?? "";
  const socialTelegram  = map["social_telegram"]  ?? "";
  const socialFacebook  = map["social_facebook"]  ?? "";

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

    /* Midtrans */
    midtrans_server_key_masked:    maskSecret(mtServerKey),
    midtrans_server_key_source:    dbMtServerKey
      ? "database" : process.env.MIDTRANS_SERVER_KEY ? "environment" : "none",
    midtrans_client_key:           mtClientKey,
    midtrans_client_key_source:    dbMtClientKey
      ? "database" : process.env.MIDTRANS_CLIENT_KEY ? "environment" : "none",
    midtrans_environment:          mtEnv === "production" ? "production" : "sandbox",

    /* Gateway selector */
    active_payment_gateway:        activeGateway,

    /* Social media links */
    social_instagram: socialInstagram,
    social_tiktok:    socialTiktok,
    social_telegram:  socialTelegram,
    social_facebook:  socialFacebook,

    /* SMTP / Email */
    smtp_host:        map["smtp_host"]  || process.env.SMTP_HOST  || "",
    smtp_port:        map["smtp_port"]  || process.env.SMTP_PORT  || "587",
    smtp_user:        map["smtp_user"]  || process.env.SMTP_USER  || "",
    smtp_pass_masked: maskSecret(map["smtp_pass"] || process.env.SMTP_PASS || ""),
    smtp_pass_source: map["smtp_pass"]
      ? "database" : process.env.SMTP_PASS ? "environment" : "none",
    smtp_from:        map["smtp_from"]  || process.env.SMTP_FROM  || "",
    app_url:          map["app_url"]    || process.env.APP_URL    || "",
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
    /* Midtrans */
    midtrans_server_key?:  string;
    midtrans_client_key?:  string;
    midtrans_environment?: string;
    /* Gateway */
    active_payment_gateway?: string;
  };

  let googleChanged   = false;
  let duitkuChanged   = false;
  let midtransChanged = false;
  let gatewayChanged  = false;

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

  // ---- Midtrans ----
  if (typeof body.midtrans_server_key === "string" && body.midtrans_server_key.trim()) {
    await upsertSetting("midtrans_server_key", body.midtrans_server_key.trim());
    midtransChanged = true;
  }
  if (typeof body.midtrans_client_key === "string" && body.midtrans_client_key.trim()) {
    await upsertSetting("midtrans_client_key", body.midtrans_client_key.trim());
    midtransChanged = true;
  }
  if (typeof body.midtrans_environment === "string") {
    const env = body.midtrans_environment === "production" ? "production" : "sandbox";
    await upsertSetting("midtrans_environment", env);
    midtransChanged = true;
  }

  // ---- Gateway ----
  if (body.active_payment_gateway === "midtrans" || body.active_payment_gateway === "duitku") {
    await upsertSetting("active_payment_gateway", body.active_payment_gateway);
    gatewayChanged = true;
  }

  // ---- Social links ----
  for (const key of ["social_instagram", "social_tiktok", "social_telegram", "social_facebook"] as const) {
    if (typeof (body as any)[key] === "string") {
      await upsertSetting(key, ((body as any)[key] as string).trim());
    }
  }

  // ---- SMTP / Email ----
  for (const key of ["smtp_host", "smtp_port", "smtp_user", "smtp_from", "app_url"] as const) {
    if (typeof (body as any)[key] === "string") {
      await upsertSetting(key, ((body as any)[key] as string).trim());
    }
  }
  if (typeof (body as any).smtp_pass === "string" && (body as any).smtp_pass.trim()) {
    await upsertSetting("smtp_pass", (body as any).smtp_pass.trim());
  }

  if (googleChanged)   invalidateGoogleCredCache();
  if (duitkuChanged)   invalidateDuitkuCredCache();
  if (midtransChanged) invalidateMidtransCache();
  if (gatewayChanged)  invalidateGatewayCache();

  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* GET /api/admin/settings/passing-grades                             */
/* ------------------------------------------------------------------ */
router.get("/admin/settings/passing-grades", requireAdmin, async (_req, res) => {
  try {
    const map = await getAllSettings();
    const raw = map["passing_grades"] ?? null;
    // Defaults sesuai standar SKD CPNS nasional
    let grades: Record<string, number> = { TWK: 65, TIU: 80, TKP: 166 };
    if (raw) {
      try { grades = { ...grades, ...JSON.parse(raw) }; } catch {}
    }
    return res.json({ grades });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* PUT /api/admin/settings/passing-grades                             */
/* ------------------------------------------------------------------ */
router.put("/admin/settings/passing-grades", requireAdmin, async (req, res) => {
  try {
    const { grades } = req.body as { grades: Record<string, number> };
    if (!grades || typeof grades !== "object")
      return res.status(400).json({ error: "Data passing grade tidak valid." });

    const sanitized: Record<string, number> = {};
    for (const [key, val] of Object.entries(grades)) {
      const n = Number(val);
      if (key.trim() && !isNaN(n) && n >= 0) sanitized[key.trim().toUpperCase()] = n;
    }
    if (Object.keys(sanitized).length === 0)
      return res.status(400).json({ error: "Tidak ada data passing grade yang valid." });

    await upsertSetting("passing_grades", JSON.stringify(sanitized));
    return res.json({ ok: true, grades: sanitized });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
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

/* ------------------------------------------------------------------ */
/* Dummy Scores — stats & generate                                     */
/* ------------------------------------------------------------------ */

/** GET /admin/dummy-scores/stats — ringkasan statistik skor dummy */
router.get("/dummy-scores/stats", requireAdmin, async (_req, res) => {
  try {
    const inDb  = await totalDummyCount();
    const stats = computeStats(buildScoreArray(DUMMY_N, DUMMY_MEAN, DUMMY_STD, DUMMY_SEED));
    return res.json({ inDb, config: { n: DUMMY_N, mean: DUMMY_MEAN, std: DUMMY_STD, seed: DUMMY_SEED }, stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /admin/dummy-scores/generate — hapus lama, generate ulang */
router.post("/dummy-scores/generate", requireAdmin, async (_req, res) => {
  try {
    const stats = await regenerateDummyScores();
    return res.json({ ok: true, inserted: stats.n, stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
