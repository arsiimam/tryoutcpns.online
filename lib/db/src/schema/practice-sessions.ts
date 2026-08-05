import { pgTable, uuid, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { questionBundlesTable } from "./question-bundles";
import { usersTable } from "./users";

export const practiceSessionsTable = pgTable("practice_sessions", {
  id:             uuid("id").defaultRandom().primaryKey(),
  userId:         uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bundleId:       integer("bundle_id").notNull().references(() => questionBundlesTable.id, { onDelete: "cascade" }),
  answers:        jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctCount:   integer("correct_count").notNull().default(0),
  completedAt:    timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PracticeSession    = typeof practiceSessionsTable.$inferSelect;
export type NewPracticeSession = typeof practiceSessionsTable.$inferInsert;
