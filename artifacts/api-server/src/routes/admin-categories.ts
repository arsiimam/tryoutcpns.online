import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { categoriesTable, subcategoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}
router.use(requireAdmin);

/* ─────────────────────── CATEGORIES ─────────────────────── */

router.get("/admin/categories", async (_req, res) => {
  try {
    const rows = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.id));
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

router.post("/admin/categories", async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nama kategori wajib diisi." });
    if (!code?.trim()) return res.status(400).json({ error: "Kode kategori wajib diisi." });

    const [row] = await db.insert(categoriesTable).values({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err?.code === "23505" || err?.cause?.code === "23505")
      return res.status(409).json({ error: "Kode kategori sudah digunakan." });
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

router.put("/admin/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, code, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nama kategori wajib diisi." });
    if (!code?.trim()) return res.status(400).json({ error: "Kode kategori wajib diisi." });

    const [row] = await db.update(categoriesTable).set({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(categoriesTable.id, id)).returning();

    if (!row) return res.status(404).json({ error: "Kategori tidak ditemukan." });
    res.json(row);
  } catch (err: any) {
    if (err?.code === "23505" || err?.cause?.code === "23505")
      return res.status(409).json({ error: "Kode kategori sudah digunakan." });
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

router.delete("/admin/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Kategori tidak ditemukan." });
    res.json({ success: true });
  } catch (err: any) {
    if (err?.cause?.code === "23503")
      return res.status(409).json({ error: "Tidak bisa dihapus — masih ada subkategori di dalamnya." });
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

/* ─────────────────────── SUBCATEGORIES ─────────────────────── */

router.get("/admin/subcategories", async (_req, res) => {
  try {
    const rows = await db.select().from(subcategoriesTable).orderBy(asc(subcategoriesTable.categoryId), asc(subcategoriesTable.id));
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

router.post("/admin/subcategories", async (req, res) => {
  try {
    const { categoryId, name, description } = req.body;
    if (!categoryId) return res.status(400).json({ error: "Kategori wajib dipilih." });
    if (!name?.trim()) return res.status(400).json({ error: "Nama subkategori wajib diisi." });

    const [row] = await db.insert(subcategoriesTable).values({
      categoryId: Number(categoryId),
      name: name.trim(),
      description: description?.trim() || null,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

router.put("/admin/subcategories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { categoryId, name, description } = req.body;
    if (!categoryId) return res.status(400).json({ error: "Kategori wajib dipilih." });
    if (!name?.trim()) return res.status(400).json({ error: "Nama subkategori wajib diisi." });

    const [row] = await db.update(subcategoriesTable).set({
      categoryId: Number(categoryId),
      name: name.trim(),
      description: description?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(subcategoriesTable.id, id)).returning();

    if (!row) return res.status(404).json({ error: "Subkategori tidak ditemukan." });
    res.json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

router.delete("/admin/subcategories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Subkategori tidak ditemukan." });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.cause?.message ?? err.message });
  }
});

export default router;
