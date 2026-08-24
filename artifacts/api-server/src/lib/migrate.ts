/**
 * Minimal in-process migration runner.
 * Each migration is an idempotent SQL string keyed by a unique name.
 * Tracks applied migrations in a `_migrations` table so each runs only once.
 */
import { pool } from "@workspace/db";
import { logger } from "./logger";

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "001_widen_correct_answer_to_text",
    sql: `ALTER TABLE questions ALTER COLUMN correct_answer TYPE text`,
  },
  {
    name: "002_add_tryout_sort_order",
    // Tambah kolom urutan manual untuk tryout_bundles + backfill dari urutan
    // created_at yang sudah ada, supaya urutan tidak berubah saat migrasi ini jalan.
    sql: `
      ALTER TABLE tryout_bundles ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

      UPDATE tryout_bundles t
      SET sort_order = ranked.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
        FROM tryout_bundles
      ) ranked
      WHERE t.id = ranked.id;
    `,
  },
  {
    name: "003_dummy_scores_names_and_top_tier",
    // Tambah kolom `name` di dummy_scores (supaya bisa tampil sebagai "peserta"
    // di papan peringkat Top 100), batasi skor dummy maksimum 523, bentuk
    // 150 skor teratas jadi kurva halus 523 → 450, lalu isi nama simulasi
    // untuk semua baris yang belum punya nama (deterministik dari id).
    sql: `
      CREATE TABLE IF NOT EXISTS dummy_scores (
        id         SERIAL PRIMARY KEY,
        score      INTEGER NOT NULL,
        name       TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE dummy_scores ADD COLUMN IF NOT EXISTS name TEXT;

      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, id) AS rn
        FROM dummy_scores
      )
      UPDATE dummy_scores d
      SET score = CASE
        WHEN ranked.rn <= 150
          THEN (GREATEST(450, LEAST(523, 523 - ROUND((ranked.rn - 1) * (523 - 450)::numeric / 149))))::int
        ELSE LEAST(d.score, 449)
      END
      FROM ranked
      WHERE d.id = ranked.id;

      UPDATE dummy_scores
      SET name = (ARRAY[
        'Ahmad','Budi','Citra','Dewi','Eka','Fajar','Gita','Hendra','Indra','Joko',
        'Kartika','Lestari','Made','Nita','Oki','Putri','Rian','Sari','Tono','Umi',
        'Vina','Wawan','Yanti','Zainal','Agus','Bayu','Chandra','Dian','Erna','Farhan',
        'Galih','Hana','Ika','Jaya','Kirana','Lina','Maya','Nanda','Oscar','Pratama'
      ])[1 + (id % 40)]
        || ' ' ||
         (ARRAY[
        'Saputra','Wijaya','Kusuma','Pratama','Santoso','Setiawan','Hidayat','Permana','Nugroho','Utomo',
        'Ramadhan','Suryani','Handayani','Wibowo','Firmansyah','Purnama','Anggraini','Maulana','Rahayu','Susanto',
        'Gunawan','Kurniawan','Fadillah','Yulianto','Puspita','Sembiring','Simanjuntak','Halim','Ariyanto','Wahyuni'
      ])[1 + ((id / 40) % 30)]
      WHERE name IS NULL;
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name      text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const m of MIGRATIONS) {
      const { rows } = await client.query(
        `SELECT 1 FROM _migrations WHERE name = $1`,
        [m.name],
      );
      if (rows.length > 0) continue; // already applied

      logger.info({ migration: m.name }, "Applying migration");
      await client.query(m.sql);
      await client.query(
        `INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [m.name],
      );
      logger.info({ migration: m.name }, "Migration applied");
    }
  } finally {
    client.release();
  }
}
