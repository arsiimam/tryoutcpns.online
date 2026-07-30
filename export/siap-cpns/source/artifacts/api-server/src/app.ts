import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const PgStore = pgSession(session);

/* ── CORS: only allow known origins ─────────────────────────────────── */
const allowedOrigins = (() => {
  const list: (string | RegExp)[] = [/localhost/, /127\.0\.0\.1/];
  const appUrl = process.env.APP_URL;
  if (appUrl) list.push(appUrl);
  return list;
})();

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // allow requests with no origin (server-to-server, curl, mobile)
      if (!origin) return cb(null, true);
      const ok = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      cb(ok ? null : new Error("Not allowed by CORS"), ok);
    },
  }),
);

app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: "sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  }),
);

// 2 MB limit — enough for large bundle imports
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", router);

/* ── Global JSON error handler ──────────────────────────────────────────
   Catches body-parser SyntaxError, async route throws, and CORS errors.
   Must be the LAST middleware registered.
───────────────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // body-parser JSON syntax error
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Request body bukan JSON yang valid." });
  }
  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Akses ditolak: origin tidak diizinkan." });
  }
  const status: number = typeof err.status === "number" ? err.status
    : typeof err.statusCode === "number" ? err.statusCode : 500;

  logger.error({ err, status }, "Unhandled error");

  // Don't leak internal stack traces in production
  const message = status < 500
    ? (err.message ?? "Request tidak valid.")
    : "Terjadi kesalahan server. Coba lagi.";

  return res.status(status).json({ error: message });
});

export default app;
