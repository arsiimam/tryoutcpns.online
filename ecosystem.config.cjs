// =============================================================================
// ecosystem.config.cjs — PM2 Ecosystem Config
// Self-contained: membaca .env sendiri tanpa bergantung pada shell environment
// Jalankan: pm2 start ecosystem.config.cjs
// =============================================================================

const fs = require("fs");
const path = require("path");

// ── Baca .env secara manual ──────────────────────────────────────────────────
const envFile = path.resolve(__dirname, ".env");
const env = {};

try {
  const lines = fs.readFileSync(envFile, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  console.log("[ecosystem] .env loaded,", Object.keys(env).length, "variables");
} catch (e) {
  console.warn("[ecosystem] .env tidak ditemukan, pakai env sistem:", e.message);
}

module.exports = {
  apps: [
    {
      name: "cpns-api",
      script: "./artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: env.NODE_ENV || "production",
        PORT: env.API_PORT || "3001",
        DATABASE_URL: env.DATABASE_URL || "",
        SESSION_SECRET: env.SESSION_SECRET || "",
        APP_URL: env.APP_URL || "",
        GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID || "",
        GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET || "",
        DUITKU_MERCHANT_CODE: env.DUITKU_MERCHANT_CODE || "",
        DUITKU_API_KEY: env.DUITKU_API_KEY || "",
        DUITKU_ENVIRONMENT: env.DUITKU_ENVIRONMENT || "sandbox",
      },
    },
  ],
};
