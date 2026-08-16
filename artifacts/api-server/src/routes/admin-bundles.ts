import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { questionBundlesTable, questionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { importLimiter } from "../lib/rate-limit";
import multer from "multer";
import JSZip from "jszip";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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

/* LIST (includes parentId for tree building) */
router.get("/admin/bundles", async (_req, res) => {
  const bundles = await db
    .select()
    .from(questionBundlesTable)
    .orderBy(questionBundlesTable.sortOrder, questionBundlesTable.createdAt);
  res.json(bundles);
});

/* CREATE EMPTY BUNDLE */
router.post("/admin/bundles", async (req, res) => {
  const { name, description, category, parentId, isPremium } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama bundle wajib diisi." });
  const [bundle] = await db
    .insert(questionBundlesTable)
    .values({
      name: name.trim(),
      description: description ?? null,
      category: category ?? null,
      parentId: parentId ? Number(parentId) : null,
      isPremium: isPremium === true,
      status: "draft",
    })
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
  const { name, description, category, parentId, sortOrder, isPremium } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama bundle wajib diisi." });
  // Prevent circular parent
  if (parentId && Number(parentId) === id)
    return res.status(400).json({ error: "Bundle tidak bisa menjadi parent-nya sendiri." });
  const [bundle] = await db
    .update(questionBundlesTable)
    .set({
      name: name.trim(),
      description: description ?? null,
      category: category ?? null,
      parentId: parentId ? Number(parentId) : null,
      ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      ...(isPremium !== undefined ? { isPremium: isPremium === true } : {}),
      updatedAt: new Date(),
    })
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

/* Helper: normalise correctAnswer to a varchar-safe string */
function normaliseCorrectAnswer(val: any): string | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val.join(",");
  return String(val);
}

/* CREATE A QUESTION */
router.post("/admin/bundles/:id/questions", async (req, res) => {
  try {
    const bundleId = Number(req.params.id);
    const { type, content, options, correctAnswer, explanation, metadata, orderNum } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Teks soal wajib diisi." });

    // Auto order: last + 1
    const lastQ = await db
      .select({ orderNum: questionsTable.orderNum })
      .from(questionsTable)
      .where(eq(questionsTable.bundleId, bundleId))
      .orderBy(desc(questionsTable.orderNum))
      .limit(1);
    const maxOrder = lastQ[0]?.orderNum ?? 0;

    const [q] = await db
      .insert(questionsTable)
      .values({
        bundleId,
        orderNum: orderNum ?? (maxOrder + 1),
        type:     type ?? "pilihan_ganda",
        content:  content.trim(),
        options:  options ?? null,
        correctAnswer: normaliseCorrectAnswer(correctAnswer),
        explanation:   explanation ?? null,
        metadata:      metadata ?? null,
      })
      .returning();
    await syncCount(bundleId);
    res.status(201).json(q);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* UPDATE A QUESTION */
router.put("/admin/bundles/:id/questions/:qid", async (req, res) => {
  try {
    const bundleId = Number(req.params.id);
    const qid      = Number(req.params.qid);
    const { type, content, options, correctAnswer, explanation, metadata, orderNum } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Teks soal wajib diisi." });

    const [q] = await db
      .update(questionsTable)
      .set({
        type:     type ?? "pilihan_ganda",
        content:  content.trim(),
        options:  options ?? null,
        correctAnswer: normaliseCorrectAnswer(correctAnswer),
        explanation:   explanation ?? null,
        metadata:      metadata ?? null,
        ...(orderNum !== undefined ? { orderNum } : {}),
        updatedAt: new Date(),
      })
      .where(eq(questionsTable.id, qid))
      .returning();
    if (!q) return res.status(404).json({ error: "Soal tidak ditemukan." });
    await syncCount(bundleId);
    res.json(q);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* GET ONE QUESTION */
router.get("/admin/bundles/:id/questions/:qid", async (req, res) => {
  try {
    const qid = Number(req.params.qid);
    const [q] = await db.select().from(questionsTable).where(eq(questionsTable.id, qid));
    if (!q) return res.status(404).json({ error: "Soal tidak ditemukan." });
    res.json(q);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
   IMPORT BUNDLE ZIP (Fase 3)
══════════════════════════════════════════════════════════ */

/**
 * POST /admin/bundles/import-zip
 * Accepts a ZIP file containing:
 *   data.json   — bundle + questions in the spec format
 *   images/     — image files referenced in questions
 *
 * Steps:
 * 1. Extract data.json → parse with existing parseJson
 * 2. Upload each image in images/ to object storage
 * 3. Replace relative image paths with /api/storage/objects/... URLs
 * 4. Save bundle + questions
 */
router.post(
  "/admin/bundles/import-zip",
  importLimiter,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "File ZIP diperlukan." });

    try {
      const storageService = new ObjectStorageService();
      const zip = await JSZip.loadAsync(req.file.buffer);

      // 1. Get data.json
      const dataFile = zip.file("data.json");
      if (!dataFile) return res.status(400).json({ error: "File ZIP harus berisi 'data.json'." });

      const rawJson = await dataFile.async("text");
      let parsed: ReturnType<typeof parseBundle>;
      try { parsed = parseBundle(rawJson, "json"); }
      catch (e: any) { return res.status(400).json({ error: e.message }); }

      if (!parsed.bundle.name?.trim())
        return res.status(400).json({ error: "Nama bundle tidak ditemukan di data.json." });

      // 2. Upload images → build path map {relative → storage URL}
      const imageMap: Record<string, string> = {};
      const localStorage = storageService.isLocalStorage();
      let baseObjectName = "";
      let bucket: ReturnType<typeof objectStorageClient.bucket> | undefined;
      if (!localStorage) {
        const privateDir = storageService.getPrivateObjectDir();
        const { bucketName, objectName } = parseGcsPath(privateDir);
        baseObjectName = objectName;
        bucket = objectStorageClient.bucket(bucketName);
      }
      const imageWarnings: string[] = [];

      const imageFiles = Object.entries(zip.files).filter(
        ([name, f]) => name.startsWith("images/") && !f.dir
      );

      await Promise.all(
        imageFiles.map(async ([name, zipEntry]) => {
          try {
            const buf = await zipEntry.async("nodebuffer");
            const ext = name.split(".").pop() ?? "jpg";
            const { randomUUID } = await import("crypto");
            const contentType = mimeFromExt(ext);
             let objectPath: string;
             if (localStorage) {
               objectPath = await storageService.saveLocalObjectEntityFromBuffer(
                 buf,
                 contentType,
               );
             } else {
               const objectId = randomUUID();
               const gcsPath = `${baseObjectName}/uploads/${objectId}`;
               const file = bucket!.file(gcsPath);
               await file.save(buf, { contentType, resumable: false });
               objectPath = `/objects/uploads/${objectId}`;
             }
            imageMap[name.replace("images/", "")] = `/api/storage${objectPath}`;
          } catch (e: any) {
            imageWarnings.push(`Gambar '${name}' gagal diupload: ${e.message}`);
          }
        })
      );

      // 3. Replace image paths in questions
      function replaceImagePaths(paths: string[] | undefined): string[] {
        if (!paths) return [];
        return paths.map(p => {
          const filename = p.replace(/^images\//, "");
          return imageMap[filename] ?? p;
        });
      }

      const questions = parsed.questions.map(q => {
        const meta = (q.metadata ?? {}) as Record<string, any>;
        if (meta.gambar_soal) meta.gambar_soal = replaceImagePaths(meta.gambar_soal);
        if (meta.pembahasan?.gambar_pembahasan)
          meta.pembahasan.gambar_pembahasan = replaceImagePaths(meta.pembahasan.gambar_pembahasan);
        return { ...q, metadata: meta };
      });

      // 4. Save bundle + questions
      const [bundle] = await db
        .insert(questionBundlesTable)
        .values({
          name:        parsed.bundle.name.trim(),
          description: parsed.bundle.description ?? null,
          category:    parsed.bundle.category ?? null,
          status:      "draft",
        })
        .returning();

      if (questions.length > 0) {
        await db.insert(questionsTable).values(
          questions.map((q, i) => ({
            bundleId:      bundle.id,
            orderNum:      q.order ?? i + 1,
            type:          q.type ?? "multiple_choice",
            content:       q.content,
            options:       q.options ?? null,
            correctAnswer: q.correct_answer ?? null,
            explanation:   q.explanation ?? null,
            metadata:      q.metadata ?? null,
          }))
        );
      }
      await syncCount(bundle.id);
      const [updated] = await db.select().from(questionBundlesTable).where(eq(questionBundlesTable.id, bundle.id));

      res.status(201).json({
        bundle:        updated,
        importedCount: questions.length,
        imageCount:    imageFiles.length,
        imageUploaded: Object.keys(imageMap).length,
        warnings:      [...parsed.errors.map(e => `Soal #${e.index}: ${e.message}`), ...imageWarnings],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/** Parse gs://bucket/path */
function parseGcsPath(gcsPath: string): { bucketName: string; objectName: string } {
  const match = gcsPath.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid GCS path: ${gcsPath}`);
  return { bucketName: match[1], objectName: match[2] };
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

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
