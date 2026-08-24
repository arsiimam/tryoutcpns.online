/**
 * Dummy Scores — core logic
 * Distribusi normal (Gaussian), seed tetap, reproducible.
 * Dipakai oleh: admin route (generate/stats) dan ranking calculator.
 */

import { db } from "@workspace/db";
import { dummyScoresTable } from "@workspace/db/schema";
import { gt, count, sql } from "drizzle-orm";

// ─── Config (Skala SKD CPNS, nilai akhir 0–550) ────────────────────────────
// TWK max 150 (30×5), TIU max 175 (35×5), TKP max 225 (45 soal bobot 1-5)
// Rata-rata peserta riil ≈ 325, std ≈ 55, passing grade SKD = 311
export const DUMMY_SEED      = 42;
export const DUMMY_N         = 11_523;
export const DUMMY_MEAN      = 325;
export const DUMMY_STD       = 55;
export const DUMMY_MIN       = 0;
export const DUMMY_MAX       = 523;
export const DUMMY_BATCH     = 500;

// ─── "Tier atas" papan peringkat ────────────────────────────────────────────
// Sejumlah skor dummy dibentuk manual (bukan murni dari kurva gaussian) agar
// Top 100 terlihat wajar: skor tertinggi persis DUMMY_TOP_MAX, lalu menurun
// halus sampai DUMMY_TOP_FLOOR di posisi ke-DUMMY_TOP_COUNT.
export const DUMMY_TOP_MAX   = 523;
export const DUMMY_TOP_FLOOR = 450;
export const DUMMY_TOP_COUNT = 150;

// ─── Pool nama simulasi (dipakai juga oleh migrasi SQL — lihat migrate.ts) ─
export const DUMMY_FIRST_NAMES = [
  "Ahmad","Budi","Citra","Dewi","Eka","Fajar","Gita","Hendra","Indra","Joko",
  "Kartika","Lestari","Made","Nita","Oki","Putri","Rian","Sari","Tono","Umi",
  "Vina","Wawan","Yanti","Zainal","Agus","Bayu","Chandra","Dian","Erna","Farhan",
  "Galih","Hana","Ika","Jaya","Kirana","Lina","Maya","Nanda","Oscar","Pratama",
];
export const DUMMY_LAST_NAMES = [
  "Saputra","Wijaya","Kusuma","Pratama","Santoso","Setiawan","Hidayat","Permana","Nugroho","Utomo",
  "Ramadhan","Suryani","Handayani","Wibowo","Firmansyah","Purnama","Anggraini","Maulana","Rahayu","Susanto",
  "Gunawan","Kurniawan","Fadillah","Yulianto","Puspita","Sembiring","Simanjuntak","Halim","Ariyanto","Wahyuni",
];

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Box-Muller: distribusi normal ────────────────────────────────────────
function gaussianSample(mean: number, std: number, rand: () => number): number {
  const u1 = Math.max(1e-10, rand());
  const u2 = rand();
  const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ─── Generate array skor (pure, tidak butuh DB) ────────────────────────────
export function buildScoreArray(
  n    = DUMMY_N,
  mean = DUMMY_MEAN,
  std  = DUMMY_STD,
  seed = DUMMY_SEED,
): number[] {
  const rand   = mulberry32(seed);
  const scores: number[] = [];
  for (let i = 0; i < n; i++) {
    const raw = gaussianSample(mean, std, rand);
    scores.push(Math.round(Math.max(DUMMY_MIN, Math.min(DUMMY_MAX, raw))));
  }

  // Bentuk tier atas: urutkan turun, paksa DUMMY_TOP_COUNT skor teratas jadi
  // kurva halus dari DUMMY_TOP_MAX ke DUMMY_TOP_FLOOR, dan pastikan sisanya
  // tidak menembus batas bawah tier itu (biar Top 100 tidak "bentrok").
  scores.sort((a, b) => b - a);
  const topCount = Math.min(DUMMY_TOP_COUNT, n);
  for (let i = 0; i < topCount; i++) {
    const t      = topCount === 1 ? 0 : i / (topCount - 1);
    const base   = DUMMY_TOP_MAX - t * (DUMMY_TOP_MAX - DUMMY_TOP_FLOOR);
    const jitter = Math.round((rand() - 0.5) * 4); // variasi +-2 poin biar tidak kaku
    scores[i] = Math.max(DUMMY_TOP_FLOOR, Math.min(DUMMY_TOP_MAX, Math.round(base + jitter)));
  }
  for (let i = topCount; i < scores.length; i++) {
    scores[i] = Math.min(scores[i], DUMMY_TOP_FLOOR - 1);
  }

  return scores;
}

// ─── Statistik ringkasan ───────────────────────────────────────────────────
export function computeStats(scores: number[]) {
  const sorted  = [...scores].sort((a, b) => a - b);
  const n       = sorted.length;
  const mean    = scores.reduce((s, v) => s + v, 0) / n;
  const variance= scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std     = Math.sqrt(variance);
  const median  = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Histogram 10 bucket
  const bucketSize = (DUMMY_MAX - DUMMY_MIN) / 10;
  const histogram: Array<{ range: string; count: number; pct: number }> = [];
  const buckets = Array(10).fill(0);
  for (const s of scores) {
    buckets[Math.min(9, Math.floor((s - DUMMY_MIN) / bucketSize))]++;
  }
  buckets.forEach((c, i) => {
    const lo = Math.round(DUMMY_MIN + i * bucketSize);
    const hi = Math.round(DUMMY_MIN + (i + 1) * bucketSize);
    histogram.push({ range: `${lo}–${hi}`, count: c, pct: Math.round(c / n * 1000) / 10 });
  });

  return {
    n,
    mean:   Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    std:    Math.round(std * 100) / 100,
    min:    sorted[0],
    max:    sorted[n - 1],
    p25:    sorted[Math.floor(n * 0.25)],
    p75:    sorted[Math.floor(n * 0.75)],
    histogram,
  };
}

// ─── DB: generate ulang semua skor dummy ──────────────────────────────────
export async function regenerateDummyScores(
  n    = DUMMY_N,
  mean = DUMMY_MEAN,
  std  = DUMMY_STD,
  seed = DUMMY_SEED,
): Promise<ReturnType<typeof computeStats>> {
  const scores = buildScoreArray(n, mean, std, seed);
  const stats  = computeStats(scores);

  // Hapus data lama
  await db.execute(sql`TRUNCATE TABLE dummy_scores RESTART IDENTITY`);

  // Insert dalam batch
  const rows = scores.map(score => ({ score }));
  for (let i = 0; i < rows.length; i += DUMMY_BATCH) {
    await db.insert(dummyScoresTable).values(rows.slice(i, i + DUMMY_BATCH));
  }

  // Isi nama simulasi (deterministik berdasarkan id) supaya bisa tampil di Top 100
  await backfillDummyNames();

  return stats;
}

/** Isi kolom `name` untuk baris dummy yang belum punya nama (deterministik berdasarkan id). */
export async function backfillDummyNames(): Promise<void> {
  const firstNames = sql.raw(
    `ARRAY[${DUMMY_FIRST_NAMES.map(n => `'${n}'`).join(",")}]`
  );
  const lastNames = sql.raw(
    `ARRAY[${DUMMY_LAST_NAMES.map(n => `'${n}'`).join(",")}]`
  );
  await db.execute(sql`
    UPDATE dummy_scores
    SET name = (${firstNames})[1 + (id % ${DUMMY_FIRST_NAMES.length})]
      || ' ' ||
       (${lastNames})[1 + ((id / ${DUMMY_FIRST_NAMES.length}) % ${DUMMY_LAST_NAMES.length})]
    WHERE name IS NULL
  `);
}

// ─── DB queries yang dipakai oleh ranking ─────────────────────────────────

/** Jumlah skor dummy yang > threshold */
export async function countDummyAbove(threshold: number): Promise<number> {
  const [row] = await db
    .select({ cnt: count() })
    .from(dummyScoresTable)
    .where(gt(dummyScoresTable.score, threshold));
  return Number(row?.cnt ?? 0);
}

/** Total skor dummy di tabel */
export async function totalDummyCount(): Promise<number> {
  const [row] = await db.select({ cnt: count() }).from(dummyScoresTable);
  return Number(row?.cnt ?? 0);
}
