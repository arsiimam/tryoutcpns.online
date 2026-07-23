import { pgTable, uuid, integer, varchar, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { tryoutBundlesTable } from "./tryout-bundles";
import { usersTable } from "./users";

export const tryoutSessionsTable = pgTable("tryout_sessions", {
  id:            uuid("id").defaultRandom().primaryKey(),
  userId:        uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tryoutId:      integer("tryout_id").notNull().references(() => tryoutBundlesTable.id, { onDelete: "cascade" }),
  status:        varchar("status", { length: 20 }).notNull().default("in_progress"),
  answers:       jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  flagged:       jsonb("flagged").$type<string[]>().notNull().default([]),
  timeRemaining: integer("time_remaining"),
  startedAt:     timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt:   timestamp("submitted_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tryoutResultsTable = pgTable("tryout_results", {
  id:             uuid("id").defaultRandom().primaryKey(),
  sessionId:      uuid("session_id").notNull().references(() => tryoutSessionsTable.id, { onDelete: "cascade" }),
  userId:         uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tryoutId:       integer("tryout_id").notNull().references(() => tryoutBundlesTable.id, { onDelete: "cascade" }),
  twkScore:       integer("twk_score").notNull().default(0),
  tiuScore:       integer("tiu_score").notNull().default(0),
  tkpScore:       integer("tkp_score").notNull().default(0),
  totalScore:     integer("total_score").notNull().default(0),
  twkCorrect:     integer("twk_correct").notNull().default(0),
  tiuCorrect:     integer("tiu_correct").notNull().default(0),
  tkpCorrect:     integer("tkp_correct").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  passed:         boolean("passed").notNull().default(false),
  rank:           integer("rank"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TryoutSession = typeof tryoutSessionsTable.$inferSelect;
export type TryoutResult  = typeof tryoutResultsTable.$inferSelect;
