import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { questionBundlesTable, questionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { importLimiter } from "../lib/rate-limit";

const router = Router();

/* ── Auth middleware ─────────────────────────────────────── */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}
router.use(requireAdmin);

/* ── helpers ─────────────────────────────────────────────── */
function syncCount(bundleId: number) {
  return db.execute(sql`
    UPDATE question_bundles
    SET question_count = (SELECT COUNT(*) FROM questions WHERE bundle_id = ${bundleId}),
        updated_at = NOW()
    WHERE id = ${bundleId}
  `);
}

/* ═══════════════════════════════════════════════════════════
   BUNDLE CRUD
══════════════════════════════════════════════════════════ */

/* LIST */
router.get("/admin/bundles", async (_req, res) => {
  const bundles = await db
    .select()
    .from(questionBundlesTable)
    .orderBy(desc(questionBundlesTable.createdAt));
  res.json(bundles);
});

/* CREATE EMPTY BUNDLE */
router.post("/admin/bundles", async (req, res) => {
  const { name, description, category } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama bundle wajib diisi." });
  const [bundle] = await db
    .insert(questionBundlesTable)
    .values({ name: name.trim(), description, category, status: "draft" })
    .returning();
  res.status(201).json(bundle);
});

/* ── Preview import (parse only, no DB write) ─────────────── */
router.post("/admin/bundles/preview", importLimiter, async (req, res) => {
  const { content, format = "json" } = req.body;
  if (!content) return res.status(400).json({ error: "Konten file diperlukan." });

  try {
    const parsed = parseBundle(content, format);
    res.json({
      bundleName:    parsed.bundle.name,
      category:      parsed.bundle.category ?? null,
      description:   parsed.bundle.description ?? null,
      questionCount: parsed.questions.length,
      imageCount:    countImages(parsed.questions),
      errors:        parsed.errors,
      preview:       parsed.questions.slice(0, 5).map(q => ({
        order:   q.order,
        type:    q.type,
        content: q.content.substring(0, 200),
        answer:  q.correct_answer,
      })),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Gagal memproses file." });
  }
});

/* ── Import bundle (parse + save) ────────────────────────── */
router.post("/admin/bundles/import", importLimiter, async (req, res) => {
  const { content, format = "json" } = req.body;
  if (!content) return res.status(400).json({ error: "Konten file diperlukan." });

  let parsed: ReturnType<typeof parseBundle>;
  try { parsed = parseBundle(content, format); }
  catch (err: any) { return res.status(400).json({ error: err.message }); }

  if (!parsed.bundle.name?.trim())
    return res.status(400).json({ error: "Nama bundle tidak ditemukan di file." });

  /* Save bundle */
  const [bundle] = await db
    .insert(questionBundlesTable)
    .values({
      name:        parsed.bundle.name.trim(),
      description: parsed.bundle.description ?? null,
      category:    parsed.bundle.category ?? null,
      status:      "draft",
    })
    .returning();

  /* Save questions */
  if (parsed.questions.length > 0) {
    const rows = parsed.questions.map((q, i) => ({
      bundleId:      bundle.id,
      orderNum:      q.order ?? i + 1,
      type:          q.type ?? "multiple_choice",
      content:       q.content,
      options:       q.options ?? null,
      correctAnswer: q.correct_answer ?? null,
      explanation:   q.explanation ?? null,
      metadata:      q.metadata ?? null,
    }));
    await db.insert(questionsTable).values(rows);
  }

  await syncCount(bundle.id);
  const [updated] = await db.select().from(questionBundlesTable).where(eq(questionBundlesTable.id, bundle.id));
  res.status(201).json({ bundle: updated, importedCount: parsed.questions.length, errors: parsed.errors });
});

/* GET SINGLE BUNDLE */
router.get("/admin/bundles/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [bundle] = await db.select().from(questionBundlesTable).where(eq(questionBundlesTable.id, id));
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json(bundle);
});

/* UPDATE BUNDLE METADATA */
router.put("/admin/bundles/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, category } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama bundle wajib diisi." });
  const [bundle] = await db
    .update(questionBundlesTable)
    .set({ name: name.trim(), description, category, updatedAt: new Date() })
    .where(eq(questionBundlesTable.id, id))
    .returning();
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json(bundle);
});

/* TOGGLE STATUS */
router.put("/admin/bundles/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["draft", "published"].includes(status))
    return res.status(400).json({ error: "Status tidak valid." });
  const [bundle] = await db
    .update(questionBundlesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(questionBundlesTable.id, id))
    .returning();
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json(bundle);
});

/* DELETE BUNDLE */
router.delete("/admin/bundles/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [bundle] = await db
    .delete(questionBundlesTable)
    .where(eq(questionBundlesTable.id, id))
    .returning();
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════
   QUESTIONS
══════════════════════════════════════════════════════════ */

/* LIST QUESTIONS IN BUNDLE */
router.get("/admin/bundles/:id/questions", async (req, res) => {
  const bundleId = Number(req.params.id);
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.bundleId, bundleId))
    .orderBy(questionsTable.orderNum);
  res.json(questions);
});

/* DELETE A QUESTION */
router.delete("/admin/bundles/:id/questions/:qid", async (req, res) => {
  const bundleId = Number(req.params.id);
  const qid      = Number(req.params.qid);
  await db.delete(questionsTable).where(eq(questionsTable.id, qid));
  await syncCount(bundleId);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════ */

router.get("/admin/bundles/:id/export", async (req, res) => {
  const id     = Number(req.params.id);
  const format = (req.query.format as string) ?? "json";

  const [bundle] = await db.select().from(questionBundlesTable).where(eq(questionBundlesTable.id, id));
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.bundleId, id))
    .orderBy(questionsTable.orderNum);

  if (format === "html") {
    const html = exportAsHtml(bundle, questions);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bundle-${id}.html"`);
    return res.send(html);
  }

  /* default: JSON */
  const payload = {
    version: "1.0",
    bundle: {
      name:        bundle.name,
      description: bundle.description,
      category:    bundle.category,
      metadata:    { exportedAt: new Date().toISOString() },
    },
    questions: questions.map(q => ({
      order:          q.orderNum,
      type:           q.type,
      content:        q.content,
      options:        q.options,
      correct_answer: q.correctAnswer,
      explanation:    q.explanation,
      metadata:       q.metadata,
    })),
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="bundle-${id}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

/* ═══════════════════════════════════════════════════════════
   PARSER HELPERS
══════════════════════════════════════════════════════════ */

interface BundleDoc {
  bundle:    { name: string; description?: string; category?: string; metadata?: any };
  questions: Array<{
    order?:          number;
    type?:           string;
    content:         string;
    options?:        any;
    correct_answer?: string;
    explanation?:    string;
    metadata?:       any;
  }>;
  errors: Array<{ index: number; message: string }>;
}

function parseBundle(content: string, format: string): BundleDoc {
  if (format === "json") return parseJson(content);
  if (format === "html") return parseHtml(content);
  throw new Error("Format tidak didukung. Gunakan json atau html.");
}

function parseJson(raw: string): BundleDoc {
  let doc: any;
  try { doc = JSON.parse(raw); }
  catch { throw new Error("JSON tidak valid. Periksa sintaks file Anda."); }

  if (!doc.bundle || !doc.questions)
    throw new Error("Struktur JSON tidak sesuai format bundle. Wajib ada field 'bundle' dan 'questions'.");

  const errors: BundleDoc["errors"] = [];
  const questions: BundleDoc["questions"] = [];

  (doc.questions as any[]).forEach((q, i) => {
    if (!q.content && !q.text) {
      errors.push({ index: i + 1, message: "Field 'content' tidak boleh kosong." });
      return;
    }
    questions.push({
      order:          q.order ?? i + 1,
      type:           q.type ?? "multiple_choice",
      content:        q.content ?? q.text,
      options:        q.options ?? null,
      correct_answer: q.correct_answer ?? q.correctAnswer ?? null,
      explanation:    q.explanation ?? null,
      metadata:       q.metadata ?? null,
    });
  });

  return { bundle: doc.bundle, questions, errors };
}

/**
 * Simple HTML bundle parser.
 * Expects structure: <article class="bundle"> ... </article>
 * Each question: <section class="question"> ... </section>
 * See docs/bundle-format.md for full spec.
 */
function parseHtml(raw: string): BundleDoc {
  const errors: BundleDoc["errors"] = [];
  const questions: BundleDoc["questions"] = [];

  const getName  = (s: string) => extractMeta(s, "name")  ?? extractTag(s, "h1") ?? "Bundle Tanpa Nama";
  const getDesc  = (s: string) => extractMeta(s, "description") ?? extractTag(s, "p.description");
  const getCat   = (s: string) => extractMeta(s, "category");

  const bundleMatch = raw.match(/<article[^>]*class="[^"]*bundle[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  const bundleBody  = bundleMatch?.[1] ?? raw;

  const bundle = {
    name:        getName(bundleBody),
    description: getDesc(bundleBody) ?? undefined,
    category:    getCat(bundleBody)  ?? undefined,
  };

  const qRegex = /<section[^>]*class="[^"]*question[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = qRegex.exec(raw)) !== null) {
    idx++;
    const body = match[1];
    const content = extractTag(body, ".content") ?? extractTag(body, "p") ?? "";
    if (!content.trim()) { errors.push({ index: idx, message: "Konten soal kosong." }); continue; }

    const optionRegex = /<li[^>]*data-key="([A-Ea-e])"[^>]*>([\s\S]*?)<\/li>/gi;
    const opts: any[] = [];
    let om: RegExpExecArray | null;
    while ((om = optionRegex.exec(body)) !== null)
      opts.push({ key: om[1].toUpperCase(), text: stripTags(om[2]) });

    questions.push({
      order:          idx,
      type:           extractAttr(body, ".question", "data-type") ?? "multiple_choice",
      content,
      options:        opts.length ? opts : null,
      correct_answer: extractAttr(body, ".answer", "data-key")?.toUpperCase() ?? extractTag(body, ".answer") ?? null,
      explanation:    extractTag(body, ".explanation") ?? null,
      metadata:       null,
    });
  }

  if (idx === 0) throw new Error("Tidak ditemukan soal. Pastikan setiap soal dibungkus <section class=\"question\">.");
  return { bundle, questions, errors };
}

/* micro DOM helpers (regex-based, no deps) */
function extractTag(html: string, selector: string): string | null {
  const cls = selector.replace(/^\./,"");
  const tag = selector.startsWith(".") ? `[^>]*class="[^"]*${cls}[^"]*"` : selector;
  const m   = html.match(new RegExp(`<(?:div|p|h[1-6]|span)${tag}[^>]*>([\s\S]*?)<\\/(?:div|p|h[1-6]|span)>`, "i"));
  return m ? stripTags(m[1]).trim() || null : null;
}
function extractAttr(html: string, selector: string, attr: string): string | null {
  const cls = selector.replace(/^\./,"");
  const m   = html.match(new RegExp(`<[^>]*class="[^"]*${cls}[^"]*"[^>]*${attr}="([^"]*)"`, "i"));
  return m?.[1] ?? null;
}
function extractMeta(html: string, name: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, "i"));
  return m?.[1] ?? null;
}
function stripTags(s: string): string { return s.replace(/<[^>]*>/g, "").trim(); }

function countImages(questions: BundleDoc["questions"]): number {
  return questions.reduce((n, q) => n + (q.content.match(/<img/gi)?.length ?? 0), 0);
}

/* ── HTML Exporter ──────────────────────────────────────── */
function exportAsHtml(bundle: any, questions: any[]): string {
  const qs = questions.map(q => {
    const opts = Array.isArray(q.options)
      ? q.options.map((o: any) =>
          `      <li data-key="${o.key}">${o.text}</li>`).join("\n")
      : "";
    return `  <section class="question" data-type="${q.type ?? "multiple_choice"}">
    <div class="content">${q.content}</div>
${opts ? `    <ol class="options">\n${opts}\n    </ol>` : ""}
    <div class="answer" data-key="${q.correctAnswer ?? ""}"></div>
    <div class="explanation">${q.explanation ?? ""}</div>
  </section>`;
  }).join("\n\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="format" content="cpns-bundle-v1" />
  <meta name="name" content="${esc(bundle.name)}" />
  <meta name="category" content="${esc(bundle.category ?? "")}" />
  <meta name="description" content="${esc(bundle.description ?? "")}" />
  <title>${esc(bundle.name)}</title>
</head>
<body>
<article class="bundle">
${qs}
</article>
</body>
</html>`;
}

function esc(s: string): string { return s.replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export default router;
