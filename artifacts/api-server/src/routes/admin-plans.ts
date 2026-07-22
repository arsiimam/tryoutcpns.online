/**
 * Admin: Subscription Plans CRUD
 * Mounted at /api/admin/plans
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, subscriptionPlansTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

/* ------------------------------------------------------------------ */
/* Auth guard                                                           */
/* ------------------------------------------------------------------ */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Tidak terautentikasi." });
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!u || u.role !== "admin") return res.status(403).json({ error: "Akses ditolak." });
  next();
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/plans                                                 */
/* ------------------------------------------------------------------ */
router.get("/admin/plans", requireAdmin, async (_req, res) => {
  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.createdAt));
  return res.json({ plans });
});

/* ------------------------------------------------------------------ */
/* POST /api/admin/plans                                                */
/* ------------------------------------------------------------------ */
router.post("/admin/plans", requireAdmin, async (req, res) => {
  const {
    name, price, originalPrice, durationDays,
    benefits, maxTryouts, isActive, colorTag, sortOrder,
  } = req.body as {
    name: string;
    price: number;
    originalPrice?: number;
    durationDays: number;
    benefits?: string[];
    maxTryouts?: number;
    isActive?: boolean;
    colorTag?: string;
    sortOrder?: number;
  };

  if (!name || price === undefined || !durationDays) {
    return res.status(400).json({ error: "name, price, dan durationDays wajib diisi." });
  }

  const [plan] = await db
    .insert(subscriptionPlansTable)
    .values({
      name:          name.trim(),
      price:         Number(price),
      originalPrice: Number(originalPrice ?? price),
      durationDays:  Number(durationDays),
      benefits:      JSON.stringify(benefits ?? []),
      maxTryouts:    Number(maxTryouts ?? 999),
      isActive:      isActive !== false,
      colorTag:      colorTag ?? "blue",
      sortOrder:     Number(sortOrder ?? 0),
    })
    .returning();

  return res.status(201).json({ plan });
});

/* ------------------------------------------------------------------ */
/* PUT /api/admin/plans/:id                                             */
/* ------------------------------------------------------------------ */
router.put("/admin/plans/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const body = req.body as Partial<{
    name: string;
    price: number;
    originalPrice: number;
    durationDays: number;
    benefits: string[];
    maxTryouts: number;
    isActive: boolean;
    colorTag: string;
    sortOrder: number;
  }>;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name        !== undefined) update.name          = body.name.trim();
  if (body.price       !== undefined) update.price         = Number(body.price);
  if (body.originalPrice !== undefined) update.originalPrice = Number(body.originalPrice);
  if (body.durationDays !== undefined) update.durationDays = Number(body.durationDays);
  if (body.benefits    !== undefined) update.benefits      = JSON.stringify(body.benefits);
  if (body.maxTryouts  !== undefined) update.maxTryouts    = Number(body.maxTryouts);
  if (body.isActive    !== undefined) update.isActive      = body.isActive;
  if (body.colorTag    !== undefined) update.colorTag      = body.colorTag;
  if (body.sortOrder   !== undefined) update.sortOrder     = Number(body.sortOrder);

  const [plan] = await db
    .update(subscriptionPlansTable)
    .set(update)
    .where(eq(subscriptionPlansTable.id, id))
    .returning();

  if (!plan) return res.status(404).json({ error: "Paket tidak ditemukan." });
  return res.json({ plan });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/admin/plans/:id                                          */
/* ------------------------------------------------------------------ */
router.delete("/admin/plans/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
  return res.json({ ok: true });
});

export default router;
