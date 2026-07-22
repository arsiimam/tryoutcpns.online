import { pgTable, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id:            uuid("id").defaultRandom().primaryKey(),
  name:          text("name").notNull(),
  price:         integer("price").notNull().default(0),          // IDR, 0 = free
  originalPrice: integer("original_price").notNull().default(0), // for strikethrough
  durationDays:  integer("duration_days").notNull().default(30),
  benefits:      text("benefits").notNull().default("[]"),       // JSON array of strings
  maxTryouts:    integer("max_tryouts").notNull().default(999),
  isActive:      boolean("is_active").notNull().default(true),
  colorTag:      text("color_tag").notNull().default("blue"),    // blue | gold | emerald | slate
  sortOrder:     integer("sort_order").notNull().default(0),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

export type SubscriptionPlan       = typeof subscriptionPlansTable.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlansTable.$inferInsert;
