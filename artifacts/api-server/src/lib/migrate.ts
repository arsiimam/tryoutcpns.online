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
