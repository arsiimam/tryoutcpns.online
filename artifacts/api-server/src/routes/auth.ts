import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { usersTable, appSettingsTable, userSubscriptionsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, inArray, and, desc, gt, sql } from "drizzle-orm";
import { authLimiter } from "../lib/rate-limit";
import { sendPasswordResetEmail } from "../lib/mailer";

const router = Router();

/* ------------------------------------------------------------------ */
/* One-time tokens for mobile OAuth session establishment              */
/* ------------------------------------------------------------------ */
interface MobileOAuthCode {
  userId: string;
  userRole: string;
  expiresAt: number;
}
const mobileOAuthCodes = new Map<string, MobileOAuthCode>();

// Purge expired codes every 60 seconds to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of mobileOAuthCodes) {
    if (val.expiresAt < now) mobileOAuthCodes.delete(key);
  }
}, 60_000).unref();

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
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    return `https://${replitDomains.split(",")[0].trim()}`;
  }
  if (devDomain) {
    return `https://${devDomain}`;
  }
  const host = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  return `https://${host}`;
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

  // Enforce single active session: hapus sesi lama milik user ini
  try {
    await db.execute(
      sql`DELETE FROM user_sessions WHERE sess->>'userId' = ${user.id}`
    );
  } catch (_) { /* non-fatal */ }

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
  const base = getBaseUrl(req as any);
  const redirectUri = getRedirectUri(base);

  const { clientId } = await getGoogleCreds();

  if (!clientId) {
    return res.redirect(`${base}/sign-in?error=google_not_configured`);
  }

  // If ?mobile=1 is passed, encode it in OAuth state so the callback can
  // redirect back to the mobile app deep-link instead of the web dashboard.
  const isMobile = (req.query as Record<string, string>).mobile === "1";
  const state = Buffer.from(JSON.stringify({ mobile: isMobile })).toString("base64url");

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

  // Decode mobile flag from OAuth state
  let isMobile = false;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      isMobile = decoded.mobile === true;
    } catch { /* ignore malformed state */ }
  }

  if (!code) {
    const errTarget = isMobile ? "cpns-mobile://auth-error?reason=cancelled" : `${base}/sign-in?error=google_cancelled`;
    return res.redirect(errTarget);
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
      const errTarget = isMobile
        ? "cpns-mobile://auth-error?reason=token_failed"
        : `${base}/sign-in?error=google_failed`;
      return res.redirect(errTarget);
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
      const errTarget = isMobile
        ? "cpns-mobile://auth-error?reason=no_email"
        : `${base}/sign-in?error=google_failed`;
      return res.redirect(errTarget);
    }

    const email = googleUser.email.toLowerCase();
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    // Upsert: login jika sudah ada, daftar otomatis jika belum
    let user = existing;
    if (!user) {
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
    } else {
      // Update avatar jika berubah
      if (googleUser.picture && googleUser.picture !== existing.avatarUrl) {
        await db
          .update(usersTable)
          .set({ avatarUrl: googleUser.picture })
          .where(eq(usersTable.id, existing.id));
      }
    }

    if (isMobile) {
      // For mobile: issue a one-time token the app exchanges for a session.
      // This avoids relying on browser-cookie sharing which is unreliable on Android.
      const token = randomUUID();
      mobileOAuthCodes.set(token, {
        userId: user.id,
        userRole: user.role,
        expiresAt: Date.now() + 60_000, // 60-second TTL
      });
      return res.redirect(`cpns-mobile://auth-success?token=${token}`);
    }

    // Web: set session directly and redirect to dashboard
    req.session.userId   = user.id;
    req.session.userRole = user.role;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    return res.redirect(`${base}/dashboard`);
  } catch (err) {
    req.log.error({ err }, "Google OAuth callback error");
    const errTarget = isMobile ? "cpns-mobile://auth-error?reason=failed" : `${base}/sign-in?error=google_failed`;
    return res.redirect(errTarget);
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/mobile-session                                       */
/* Exchange a one-time OAuth token (from deep-link) for a real session */
/* ------------------------------------------------------------------ */
router.post("/auth/mobile-session", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: "Token wajib diisi." });
  }

  const code = mobileOAuthCodes.get(token);
  if (!code || code.expiresAt < Date.now()) {
    mobileOAuthCodes.delete(token);
    return res.status(401).json({ error: "Token tidak valid atau sudah kedaluwarsa." });
  }

  // One-time use: delete immediately
  mobileOAuthCodes.delete(token);

  // Establish session
  req.session.userId   = code.userId;
  req.session.userRole = code.userRole;
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, code.userId))
    .limit(1);

  if (!user) {
    return res.status(404).json({ error: "User tidak ditemukan." });
  }

  return res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
  });
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/forgot-password                                      */
/* ------------------------------------------------------------------ */
router.post("/auth/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) return res.status(400).json({ error: "Email wajib diisi." });

  // Always return 200 so we don't leak which emails are registered
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (user && user.authProvider === "email") {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await db
      .delete(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.userId, user.id));

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    try {
      await sendPasswordResetEmail(user.email, user.fullName, token);
    } catch (err) {
      req.log.error({ err }, "Failed to send reset email");
    }
  }

  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/reset-password                                       */
/* ------------------------------------------------------------------ */
router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ error: "Data tidak lengkap." });
  if (password.length < 8) return res.status(400).json({ error: "Password minimal 8 karakter." });

  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      )
    )
    .limit(1);

  if (!row || row.usedAt) {
    return res.status(400).json({ error: "Link tidak valid atau sudah kedaluwarsa." });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, row.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, row.id));

  return res.json({ ok: true });
});

export default router;
