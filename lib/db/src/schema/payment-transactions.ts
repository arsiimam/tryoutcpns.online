import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id:              uuid("id").defaultRandom().primaryKey(),
  userId:          uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  merchantOrderId: text("merchant_order_id").notNull().unique(),
  planId:          text("plan_id").notNull(),
  planName:        text("plan_name").notNull(),
  amount:          integer("amount").notNull(),
  /** pending | success | failed | expired | cancelled */
  status:          text("status").notNull().default("pending"),
  paymentMethod:   text("payment_method"),
  duitkuReference: text("duitku_reference"),   // reference from Duitku API
  callbackData:    text("callback_data"),       // raw JSON from callback for audit
  expiresAt:       timestamp("expires_at"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});

export type PaymentTransaction       = typeof paymentTransactionsTable.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactionsTable.$inferInsert;
