import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppSetting = typeof appSettingsTable.$inferSelect;
