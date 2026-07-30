import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const questionBundlesTable = pgTable("question_bundles", {
  id:            serial("id").primaryKey(),
  name:          varchar("name", { length: 255 }).notNull(),
  description:   text("description"),
  category:      varchar("category", { length: 100 }),
  status:        varchar("status", { length: 20 }).notNull().default("draft"),
  questionCount: integer("question_count").notNull().default(0),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuestionBundle    = typeof questionBundlesTable.$inferSelect;
export type NewQuestionBundle = typeof questionBundlesTable.$inferInsert;
