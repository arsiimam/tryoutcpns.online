import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionPlansTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

/**
 * GET /plans  — public: list active subscription plans for landing page & checkout
 */
router.get("/plans", async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(asc(subscriptionPlansTable.sortOrder));

    const result = plans.map((p) => ({
      id:            p.id,
      name:          p.name,
      price:         p.price,
      originalPrice: p.originalPrice,
      durationDays:  p.durationDays,
      benefits:      (() => { try { return JSON.parse(p.benefits); } catch { return []; } })(),
      colorTag:      p.colorTag,
      maxTryouts:    p.maxTryouts,
      sortOrder:     p.sortOrder,
    }));

    res.json({ plans: result });
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat paket langganan." });
  }
});

export default router;
