import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { couponsTable } from "@workspace/db";
import { eq, desc, ilike } from "drizzle-orm";

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}
router.use(requireAdmin);

/* LIST */
router.get("/admin/coupons", async (req, res) => {
  try {
    const coupons = await db
      .select()
      .from(couponsTable)
      .orderBy(desc(couponsTable.createdAt));
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data kupon." });
  }
});

/* CREATE */
router.post("/admin/coupons", async (req, res) => {
  try {
    const {
      code, description, discountType, discountValue,
      minPurchase, maxDiscount, quota, validFrom, validUntil, isActive,
    } = req.body;

    if (!code?.trim()) return res.status(400).json({ error: "Kode kupon wajib diisi." });
    if (!discountValue || discountValue <= 0)
      return res.status(400).json({ error: "Nilai diskon harus lebih dari 0." });
    if (discountType === "percentage" && discountValue > 100)
      return res.status(400).json({ error: "Diskon persentase tidak boleh lebih dari 100%." });
    if (!validUntil) return res.status(400).json({ error: "Tanggal berlaku wajib diisi." });

    const [coupon] = await db.insert(couponsTable).values({
      code: code.trim().toUpperCase(),
      description: description ?? null,
      discountType: discountType ?? "percentage",
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase ?? 0),
      maxDiscount: Number(maxDiscount ?? 0),
      quota: Number(quota ?? 1),
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      isActive: isActive !== false,
    }).returning();

    res.status(201).json(coupon);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Kode kupon sudah digunakan. Gunakan kode yang berbeda." });
    }
    console.error(err);
    res.status(500).json({ error: "Gagal membuat kupon." });
  }
});

/* UPDATE */
router.put("/admin/coupons/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      code, description, discountType, discountValue,
      minPurchase, maxDiscount, quota, validFrom, validUntil, isActive,
    } = req.body;

    if (!code?.trim()) return res.status(400).json({ error: "Kode kupon wajib diisi." });
    if (!discountValue || discountValue <= 0)
      return res.status(400).json({ error: "Nilai diskon harus lebih dari 0." });

    const [coupon] = await db.update(couponsTable).set({
      code: code.trim().toUpperCase(),
      description: description ?? null,
      discountType: discountType ?? "percentage",
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase ?? 0),
      maxDiscount: Number(maxDiscount ?? 0),
      quota: Number(quota ?? 1),
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      isActive: isActive !== false,
      updatedAt: new Date(),
    }).where(eq(couponsTable.id, id)).returning();

    if (!coupon) return res.status(404).json({ error: "Kupon tidak ditemukan." });
    res.json(coupon);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Kode kupon sudah digunakan. Gunakan kode yang berbeda." });
    }
    console.error(err);
    res.status(500).json({ error: "Gagal memperbarui kupon." });
  }
});

/* TOGGLE ACTIVE */
router.put("/admin/coupons/:id/toggle", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(couponsTable).where(eq(couponsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Kupon tidak ditemukan." });

    const [coupon] = await db.update(couponsTable)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(couponsTable.id, id))
      .returning();
    res.json(coupon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengubah status kupon." });
  }
});

/* DELETE */
router.delete("/admin/coupons/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [coupon] = await db.delete(couponsTable).where(eq(couponsTable.id, id)).returning();
    if (!coupon) return res.status(404).json({ error: "Kupon tidak ditemukan." });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus kupon." });
  }
});

export default router;
