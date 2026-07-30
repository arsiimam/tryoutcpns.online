import { pgTable, serial, integer, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { questionBundlesTable } from "./question-bundles";

export const questionsTable = pgTable("questions", {
  id:            serial("id").primaryKey(),
  bundleId:      integer("bundle_id").notNull().references(() => questionBundlesTable.id, { onDelete: "cascade" }),
  orderNum:      integer("order_num").notNull().default(1),
  type:          varchar("type", { length: 50 }).notNull().default("multiple_choice"),
  content:       text("content").notNull(),
  options:       jsonb("options"),        // [{key:"A", text:"..."}, ...]
  correctAnswer: varchar("correct_answer", { length: 10 }),
  explanation:   text("explanation"),
  metadata:      jsonb("metadata"),      // {difficulty, tags, source, ...}
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Question    = typeof questionsTable.$inferSelect;
export type NewQuestion = typeof questionsTable.$inferInsert;
