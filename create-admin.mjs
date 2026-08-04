#!/usr/bin/env node
// =============================================================================
// create-admin.mjs — Buat atau reset akun admin
// Jalankan: node create-admin.mjs
// Env: DATABASE_URL wajib ada di .env atau environment
// =============================================================================
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Load .env jika ada ──────────────────────────────────────────────────────
const envPath = resolve(__dirname, ".env");
try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("✓ .env loaded");
} catch {
  console.log("  .env tidak ditemukan, pakai env dari sistem");
}

// ── Konfigurasi admin ───────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "arsiimam28@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SiapCPNS@Admin2024";
const ADMIN_NAME     = process.env.ADMIN_NAME     || "Arsi Imam";
const DATABASE_URL   = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL tidak ditemukan. Isi .env terlebih dahulu.");
  process.exit(1);
}

// ── Cari pg & bcryptjs dari node_modules ────────────────────────────────────
function findModule(name, subpath) {
  const bases = [
    resolve(__dirname, "node_modules", name),
    // pnpm virtual store
    ...(() => {
      try {
        const store = resolve(__dirname, "node_modules/.pnpm");
        const { readdirSync } = require("fs");
        return readdirSync(store)
          .filter(d => d.startsWith(name.replace("/", "+")))
          .map(d => resolve(store, d, "node_modules", name));
      } catch { return []; }
    })(),
  ];
  for (const base of bases) {
    try {
      const full = resolve(base, subpath);
      require.resolve(full);
      return full;
    } catch {}
  }
  return null;
}

const pgPath     = findModule("pg", "lib/index.js");
const bcryptPath = findModule("bcryptjs", "dist/bcrypt.js");

if (!pgPath)     { console.error("ERROR: pg tidak ditemukan di node_modules"); process.exit(1); }
if (!bcryptPath) { console.error("ERROR: bcryptjs tidak ditemukan di node_modules"); process.exit(1); }

const { Pool } = require(pgPath);
const bcrypt   = require(bcryptPath);

// ── Main ────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: DATABASE_URL });

try {
  console.log(`\nMembuat akun admin: ${ADMIN_EMAIL}`);
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  console.log("✓ Password di-hash");

  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, auth_provider, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
       SET full_name     = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role          = EXCLUDED.role
     RETURNING id, email, role`,
    [ADMIN_NAME, ADMIN_EMAIL, hash, "email", "admin"]
  );

  const user = result.rows[0];
  console.log("\n✅ Akun admin siap!");
  console.log(`   Email    : ${user.email}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log(`   Role     : ${user.role}`);
  console.log(`   ID       : ${user.id}`);
  console.log("\n⚠️  Segera ganti password setelah login pertama!\n");
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
