import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";

export const subcategoriesTable = pgTable("subcategories", {
  id:          serial("id").primaryKey(),
  categoryId:  integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subcategory    = typeof subcategoriesTable.$inferSelect;
export type NewSubcategory = typeof subcategoriesTable.$inferInsert;
