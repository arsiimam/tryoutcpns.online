import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, appSettingsTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const router = Router();

const CMS_SECTIONS = [
  "hero",
  "fitur",
  "statistik",
  "testimoni",
  "paket",
  "faq",
  "cta",
  "footer",
] as const;

const DEFAULT_HTML: Record<string, string> = {
  hero: `<section class="lp-hero">
  <div class="lp-container lp-hero-grid">
    <div class="lp-hero-copy">
      <h1 class="lp-hero-title">Lolos CPNS dengan<br/><span>Simulasi CAT Terbaik</span></h1>
      <p class="lp-hero-desc">Latihan soal TWK, TIU, dan TKP dengan sistem yang sama persis seperti ujian resmi BKN.</p>
      <div class="lp-hero-actions">
        <a href="/sign-up" class="lp-btn-lg-primary">Mulai Tryout Gratis →</a>
        <a href="#fitur" class="lp-btn-lg-ghost">▶ Lihat Fitur</a>
      </div>
    </div>
  </div>
</section>`,
  fitur: `<section id="fitur" class="lp-features">
  <div class="lp-container">
    <h2>Kenapa Pilih Tryout CPNS?</h2>
    <p>Platform terlengkap dengan fitur yang dirancang untuk keberhasilan Anda.</p>
  </div>
</section>`,
  statistik: `<div class="lp-stats">
  <div class="lp-stat"><strong>10.000+</strong><span>Peserta</span></div>
  <div class="lp-stat"><strong>85%</strong><span>Lolos</span></div>
  <div class="lp-stat"><strong>500+</strong><span>Soal</span></div>
</div>`,
  testimoni: `<section id="testimoni" class="lp-testimonials">
  <div class="lp-container">
    <h2>Apa Kata Peserta Kami</h2>
  </div>
</section>`,
  paket: `<section id="paket" class="lp-pricing">
  <div class="lp-container">
    <h2>Pilih Paket yang Sesuai</h2>
  </div>
</section>`,
  faq: `<section id="faq" class="lp-faq">
  <div class="lp-container">
    <h2>Pertanyaan yang Sering Ditanya</h2>
  </div>
</section>`,
  cta: `<section class="lp-cta">
  <div class="lp-container">
    <h2>Siap Lolos CPNS?</h2>
    <a href="/sign-up" class="lp-btn-lg-primary">Daftar Sekarang</a>
  </div>
</section>`,
  footer: `<footer class="lp-footer">
  <div class="lp-container">
    <p>© 2024 TryoutCPNS.online — Simulasi CAT Terbaik Indonesia</p>
  </div>
</footer>`,
};

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
/* ------------------------------------------------------------------ */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Tidak terautentikasi." });
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Akses ditolak." });
  next();
}

async function upsertSetting(key: string, value: string) {
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
}

/* ------------------------------------------------------------------ */
/* GET /api/admin/cms  — returns all sections                          */
/* ------------------------------------------------------------------ */
router.get("/admin/cms", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(like(appSettingsTable.key, "cms_%"));

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key.replace("cms_", "")] = r.value;

  const sections: Record<string, string> = {};
  for (const s of CMS_SECTIONS) {
    sections[s] = map[s] ?? DEFAULT_HTML[s] ?? "";
  }

  return res.json({ sections });
});

/* ------------------------------------------------------------------ */
/* PUT /api/admin/cms  — save one or more sections                     */
/* Body: { section: string, html: string }                             */
/* ------------------------------------------------------------------ */
router.put("/admin/cms", requireAdmin, async (req, res) => {
  const { section, html } = req.body as { section?: string; html?: string };
  if (!section || typeof html !== "string") {
    return res.status(400).json({ error: "Field 'section' dan 'html' wajib diisi." });
  }
  if (!CMS_SECTIONS.includes(section as any)) {
    return res.status(400).json({ error: "Section tidak dikenal." });
  }
  await upsertSetting(`cms_${section}`, html);
  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* GET /api/cms/:section  — public read (for landing page rendering)   */
/* ------------------------------------------------------------------ */
router.get("/cms/:section", async (req, res) => {
  const { section } = req.params;
  if (!CMS_SECTIONS.includes(section as any)) {
    return res.status(404).json({ error: "Section tidak ditemukan." });
  }
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, `cms_${section}`))
    .limit(1);
  const html = row?.value ?? DEFAULT_HTML[section] ?? "";
  return res.json({ section, html });
});

export default router;
