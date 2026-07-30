import { pgTable, serial, varchar, text, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";

export const tryoutBundlesTable = pgTable("tryout_bundles", {
  id:              serial("id").primaryKey(),
  name:            varchar("name", { length: 255 }).notNull(),
  description:     text("description"),
  category:        varchar("category", { length: 100 }),
  durationMinutes: integer("duration_minutes").notNull().default(100),
  passingGrade:    integer("passing_grade").notNull().default(0),
  status:          varchar("status", { length: 20 }).notNull().default("draft"),
  settings:        jsonb("settings"),
  totalQuestions:  integer("total_questions").notNull().default(0),
  isFree:          boolean("is_free").notNull().default(false),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tryoutSectionsTable = pgTable("tryout_sections", {
  id:               serial("id").primaryKey(),
  tryoutId:         integer("tryout_id").notNull().references(() => tryoutBundlesTable.id, { onDelete: "cascade" }),
  name:             varchar("name", { length: 255 }).notNull(),
  category:         varchar("category", { length: 100 }),
  orderNum:         integer("order_num").notNull().default(1),
  questionCount:    integer("question_count").notNull().default(0),
  timeLimitMinutes: integer("time_limit_minutes"),
  passingScore:     integer("passing_score"),
});

export const tryoutQuestionsTable = pgTable("tryout_questions", {
  id:            serial("id").primaryKey(),
  tryoutId:      integer("tryout_id").notNull().references(() => tryoutBundlesTable.id, { onDelete: "cascade" }),
  sectionId:     integer("section_id").notNull().references(() => tryoutSectionsTable.id, { onDelete: "cascade" }),
  orderNum:      integer("order_num").notNull().default(1),
  type:          varchar("type", { length: 50 }).notNull().default("multiple_choice"),
  content:       text("content").notNull(),
  options:       jsonb("options"),
  correctAnswer: varchar("correct_answer", { length: 10 }),
  explanation:   text("explanation"),
  metadata:      jsonb("metadata"),
  scoreWeight:   integer("score_weight").notNull().default(1),
});

export type TryoutBundle    = typeof tryoutBundlesTable.$inferSelect;
export type TryoutSection   = typeof tryoutSectionsTable.$inferSelect;
export type TryoutQuestion  = typeof tryoutQuestionsTable.$inferSelect;
