import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, appSettingsTable, userSubscriptionsTable } from "@workspace/db";
import { eq, inArray, and, desc } from "drizzle-orm";
import { authLimiter } from "../lib/rate-limit";

const router = Router();

/* ------------------------------------------------------------------ */
/* Google credential cache (populated from DB, env as fallback)        */
/* ------------------------------------------------------------------ */
let _credCache: { clientId: string; clientSecret: string; ts: number } | null = null;
const CRED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getGoogleCreds(): Promise<{ clientId: string; clientSecret: string }> {
  if (_credCache && Date.now() - _credCache.ts < CRED_CACHE_TTL_MS) {
    return _credCache;
  }

  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(inArray(appSettingsTable.key, ["google_client_id", "google_client_secret"]));

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  _credCache = {
    clientId: map["google_client_id"] || process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: map["google_client_secret"] || process.env.GOOGLE_CLIENT_SECRET || "",
    ts: Date.now(),
  };
  return _credCache;
}

/** Called by admin route when settings are updated */
export function invalidateGoogleCredCache() {
  _credCache = null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  // APP_URL takes priority (set in .env for self-hosted)
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl;
  // Fallback: derive from request headers (works behind reverse proxy)
  const proto = req.headers["x-forwarded-proto"] ?? "http";
  const host = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  return `${proto}://${host}`;
}

function getRedirectUri(base: string): string {
  return `${base}/api/auth/google/callback`;
}

function userPayload(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
  };
}

/* ------------------------------------------------------------------ */
/* POST /api/auth/register                                             */
/* ------------------------------------------------------------------ */
router.post("/auth/register", authLimiter, async (req, res) => {
  const { fullName, email, password } = req.body as Record<string, string>;

  if (!fullName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Data tidak lengkap." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password minimal 8 karakter." });
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Email sudah terdaftar." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      authProvider: "email",
    })
    .returning();

  req.session.userId   = user.id;
  req.session.userRole = user.role;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
  return res.json({ user: userPayload(user) });
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/login                                                */
/* ------------------------------------------------------------------ */
router.post("/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body as Record<string, string>;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email dan password diperlukan." });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Email atau password salah." });
  }

  req.session.userId   = user.id;
  req.session.userRole = user.role;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
  return res.json({ user: userPayload(user) });
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/logout                                               */
/* ------------------------------------------------------------------ */
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/auth/me                                                    */
/* ------------------------------------------------------------------ */
router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: "Tidak terautentikasi." });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Pengguna tidak ditemukan." });
  }

  // Fetch active subscription
  const [sub] = await db
    .select()
    .from(userSubscriptionsTable)
    .where(
      and(
        eq(userSubscriptionsTable.userId, user.id),
        eq(userSubscriptionsTable.status, "active"),
      )
    )
    .orderBy(desc(userSubscriptionsTable.expiresAt))
    .limit(1);

  const daysLeft = sub
    ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  return res.json({
    user: {
      ...userPayload(user),
      subscription: sub
        ? { planId: sub.planId, planName: sub.planName, status: sub.status, expiresAt: sub.expiresAt, daysLeft }
        : null,
    },
  });
});

/* ------------------------------------------------------------------ */
/* GET /api/auth/google                                                */
/* ------------------------------------------------------------------ */
router.get("/auth/google", async (req, res) => {
  const flow = (req.query.flow as string) === "signup" ? "signup" : "signin";
  const base = getBaseUrl(req as any);
  const redirectUri = getRedirectUri(base);

  const { clientId } = await getGoogleCreds();

  if (!clientId) {
    return res.redirect(`${base}/sign-in?error=google_not_configured`);
  }

  const state = Buffer.from(JSON.stringify({ flow })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/* ------------------------------------------------------------------ */
/* GET /api/auth/google/callback                                       */
/* ------------------------------------------------------------------ */
router.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const base = getBaseUrl(req as any);

  let flow: "signin" | "signup" = "signup";
  try {
    if (state) {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
      if (parsed.flow === "signin") flow = "signin";
    }
  } catch {
    // default to signup
  }

  if (!code) {
    return res.redirect(`${base}/sign-in?error=google_cancelled`);
  }

  try {
    const redirectUri = getRedirectUri(base);
    const { clientId, clientSecret } = await getGoogleCreds();

    // Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokens.access_token) {
      req.log.error({ tokens }, "Google token exchange failed");
      return res.redirect(`${base}/sign-in?error=google_failed`);
    }

    // Get Google user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json() as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!googleUser.email) {
      return res.redirect(`${base}/sign-in?error=google_failed`);
    }

    const email = googleUser.email.toLowerCase();
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // signin flow: only log in existing users
    if (flow === "signin" && !existing) {
      return res.redirect(`${base}/sign-in?error=account_not_found`);
    }

    let user = existing;
    if (!user) {
      // signup flow: create account
      const [created] = await db
        .insert(usersTable)
        .values({
          fullName: googleUser.name ?? email,
          email,
          authProvider: "google",
          avatarUrl: googleUser.picture ?? null,
        })
        .returning();
      user = created;
    }

    req.session.userId   = user.id;
    req.session.userRole = user.role;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    return res.redirect(`${base}/dashboard`);
  } catch (err) {
    req.log.error({ err }, "Google OAuth callback error");
    return res.redirect(`${base}/sign-in?error=google_failed`);
  }
});

export default router;
