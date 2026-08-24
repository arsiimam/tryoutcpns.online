import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Tabel untuk menyimpan skor dummy simulasi peserta.
 * `name` adalah nama tampilan simulasi (fiktif) yang ditampilkan di papan
 * peringkat Top 100 bersama peserta nyata — juga tetap jadi basis kalkulasi
 * ranking/distribusi untuk semua peserta.
 */
export const dummyScoresTable = pgTable("dummy_scores", {
  id:        serial("id").primaryKey(),
  score:     integer("score").notNull(),
  name:      text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
