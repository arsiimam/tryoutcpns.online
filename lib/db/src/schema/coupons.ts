import { pgTable, serial, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const couponsTable = pgTable("coupons", {
  id:            serial("id").primaryKey(),
  code:          varchar("code", { length: 50 }).notNull().unique(),
  description:   text("description"),
  discountType:  varchar("discount_type", { length: 20 }).notNull().default("percentage"), // "percentage" | "fixed"
  discountValue: integer("discount_value").notNull().default(0),
  minPurchase:   integer("min_purchase").notNull().default(0),
  maxDiscount:   integer("max_discount").notNull().default(0),
  quota:         integer("quota").notNull().default(1),
  usedCount:     integer("used_count").notNull().default(0),
  validFrom:     timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  validUntil:    timestamp("valid_until", { withTimezone: true }).notNull(),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Coupon    = typeof couponsTable.$inferSelect;
export type NewCoupon = typeof couponsTable.$inferInsert;
