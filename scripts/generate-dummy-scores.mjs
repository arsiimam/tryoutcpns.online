#!/usr/bin/env node
/**
 * Script standalone: Generate Dummy Scores
 * =========================================
 * Koneksikan langsung ke PostgreSQL menggunakan DATABASE_URL dari .env
 * Tidak perlu kompilasi TypeScript.
 *
 * Cara pakai:
 *   node scripts/generate-dummy-scores.mjs
 *   # atau dengan .env custom:
 *   DATABASE_URL=postgres://... node scripts/generate-dummy-scores.mjs
 *
 * Untuk load dari file .env otomatis:
 *   node --env-file=artifacts/api-server/.env scripts/generate-dummy-scores.mjs
 */

// ─── Konfigurasi ──────────────────────────────────────────────────────────
// Skala SKD CPNS: total nilai akhir 0–550
// TWK max 150, TIU max 175, TKP max 225 → total 550
// Rata-rata peserta riil ≈ 325, std ≈ 55, passing grade = 311
const SEED      = 42;
const N         = 11_523;
const MEAN      = 325;
const STD       = 55;
const MIN_SCORE = 0;
const MAX_SCORE = 550;
const BATCH     = 500;

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianSample(mean, std, rand) {
  const u1 = Math.max(1e-10, rand());
  const u2 = rand();
  const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function generateScores() {
  const rand   = mulberry32(SEED);
  const scores = [];
  for (let i = 0; i < N; i++) {
    const raw = gaussianSample(MEAN, STD, rand);
    scores.push(Math.round(Math.max(MIN_SCORE, Math.min(MAX_SCORE, raw))));
  }
  return scores;
}

function printStats(scores) {
  const sorted  = [...scores].sort((a, b) => a - b);
  const n       = sorted.length;
  const mean    = scores.reduce((s, v) => s + v, 0) / n;
  const variance= scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std     = Math.sqrt(variance);
  const median  = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const buckets = Array(10).fill(0);
  const bs = (MAX_SCORE - MIN_SCORE) / 10;
  for (const s of scores) buckets[Math.min(9, Math.floor((s - MIN_SCORE) / bs))]++;

  console.log("\n════════════════════════════════════════");
  console.log(" STATISTIK SKOR DUMMY");
  console.log("════════════════════════════════════════");
  console.log(`  Jumlah  : ${n.toLocaleString()}`);
  console.log(`  Mean    : ${mean.toFixed(2)}`);
  console.log(`  Median  : ${median.toFixed(2)}`);
  console.log(`  Std Dev : ${std.toFixed(2)}`);
  console.log(`  Min     : ${sorted[0]}`);
  console.log(`  Max     : ${sorted[n - 1]}`);
  console.log(`  P25     : ${sorted[Math.floor(n * 0.25)]}`);
  console.log(`  P75     : ${sorted[Math.floor(n * 0.75)]}`);
  console.log("\n  Histogram (setiap █ ≈ 2.5%):");
  buckets.forEach((count, i) => {
    const lo  = MIN_SCORE + i * bs;
    const bar = "█".repeat(Math.round(count / n * 40));
    const pct = ((count / n) * 100).toFixed(1);
    console.log(`  [${String(lo).padStart(3)}–${String(lo + bs).padStart(3)}] ${bar.padEnd(42)} ${pct}%`);
  });
  console.log("════════════════════════════════════════\n");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL tidak ditemukan. Set env var atau gunakan --env-file.");
    process.exit(1);
  }

  // Lazy-import pg
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: dbUrl });

  try {
    console.log(`\n🎲 Generating ${N.toLocaleString()} dummy scores (seed=${SEED}, mean=${MEAN}, std=${STD})…`);
    const scores = generateScores();
    printStats(scores);

    console.log("🗑  Menghapus data dummy lama…");
    await pool.query("TRUNCATE TABLE dummy_scores RESTART IDENTITY");

    console.log(`💾 Menyimpan ke database…`);
    let inserted = 0;
    for (let i = 0; i < scores.length; i += BATCH) {
      const batch = scores.slice(i, i + BATCH);
      // Build parameterized INSERT
      const values = batch.map((_, j) => `($${j + 1})`).join(", ");
      await pool.query(`INSERT INTO dummy_scores (score) VALUES ${values}`, batch);
      inserted += batch.length;
      process.stdout.write(`\r   ${inserted.toLocaleString()} / ${N.toLocaleString()} diinsert…`);
    }

    console.log(`\n✅ Selesai! ${inserted.toLocaleString()} skor dummy berhasil disimpan.\n`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
