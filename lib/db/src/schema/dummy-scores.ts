import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Tabel untuk menyimpan skor dummy simulasi peserta.
 * Digunakan hanya sebagai basis kalkulasi ranking — tidak pernah ditampilkan
 * sebagai peserta individual ke user manapun.
 */
export const dummyScoresTable = pgTable("dummy_scores", {
  id:        serial("id").primaryKey(),
  score:     integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
