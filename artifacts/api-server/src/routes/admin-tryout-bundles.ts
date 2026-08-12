import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { tryoutBundlesTable, tryoutSectionsTable, tryoutQuestionsTable, appSettingsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { importLimiter } from "../lib/rate-limit";

/* ── Global passing grades helper ──────────────────────── */
async function getGlobalPassingGrades(): Promise<Record<string, number>> {
  const defaults: Record<string, number> = { TWK: 65, TIU: 80, TKP: 166 };
  try {
    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "passing_grades"));
    if (row?.value) return { ...defaults, ...JSON.parse(row.value) };
  } catch {}
  return defaults;
}

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}
router.use(requireAdmin);

/* ── helpers ─────────────────────────────────────────── */
async function syncCounts(tryoutId: number) {
  const sections = await db.select().from(tryoutSectionsTable).where(eq(tryoutSectionsTable.tryoutId, tryoutId));
  for (const s of sections) {
    await db.execute(sql`
      UPDATE tryout_sections SET question_count = (
        SELECT COUNT(*) FROM tryout_questions WHERE section_id = ${s.id}
      ) WHERE id = ${s.id}
    `);
  }
  await db.execute(sql`
    UPDATE tryout_bundles SET
      total_questions = (SELECT COUNT(*) FROM tryout_questions WHERE tryout_id = ${tryoutId}),
      updated_at = NOW()
    WHERE id = ${tryoutId}
  `);
}

/* ═══════════════════════════════════════════════════════
   BUNDLE CRUD
═══════════════════════════════════════════════════════ */

/* LIST */
router.get("/admin/tryouts", async (_req, res) => {
  const bundles = await db.select().from(tryoutBundlesTable).orderBy(desc(tryoutBundlesTable.createdAt));
  // attach section summary per bundle
  const ids = bundles.map(b => b.id);
  const sections = ids.length
    ? await db.select().from(tryoutSectionsTable).orderBy(tryoutSectionsTable.orderNum)
    : [];
  const result = bundles.map(b => ({
    ...b,
    sections: sections.filter(s => s.tryoutId === b.id),
  }));
  res.json(result);
});

/* CREATE EMPTY BUNDLE */
router.post("/admin/tryouts", async (req, res) => {
  const { name, description, category, durationMinutes, passingGrade, settings, isFree } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama tryout wajib diisi." });
  const [bundle] = await db.insert(tryoutBundlesTable).values({
    name: name.trim(), description, category,
    durationMinutes: durationMinutes ?? 100,
    passingGrade: passingGrade ?? 0,
    settings: settings ?? null,
    isFree: isFree ?? false,
    status: "draft",
  }).returning();
  res.status(201).json({ ...bundle, sections: [] });
});

/* GET SINGLE BUNDLE (with sections + questions) */
router.get("/admin/tryouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [bundle] = await db.select().from(tryoutBundlesTable).where(eq(tryoutBundlesTable.id, id));
  if (!bundle) return res.status(404).json({ error: "Bundle tryout tidak ditemukan." });
  const sections = await db.select().from(tryoutSectionsTable)
    .where(eq(tryoutSectionsTable.tryoutId, id)).orderBy(tryoutSectionsTable.orderNum);
  const questions = await db.select().from(tryoutQuestionsTable)
    .where(eq(tryoutQuestionsTable.tryoutId, id)).orderBy(tryoutQuestionsTable.orderNum);
  const sectionsWithQ = sections.map(s => ({
    ...s,
    questions: questions.filter(q => q.sectionId === s.id),
  }));
  res.json({ ...bundle, sections: sectionsWithQ });
});

/* UPDATE BUNDLE METADATA */
router.put("/admin/tryouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, category, durationMinutes, passingGrade, settings, isFree } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama tryout wajib diisi." });
  const [bundle] = await db.update(tryoutBundlesTable).set({
    name: name.trim(), description, category,
    durationMinutes: durationMinutes ?? 100,
    passingGrade: passingGrade ?? 0,
    settings: settings ?? null,
    isFree: isFree ?? false,
    updatedAt: new Date(),
  }).where(eq(tryoutBundlesTable.id, id)).returning();
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json(bundle);
});

/* TOGGLE STATUS */
router.put("/admin/tryouts/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["draft", "published"].includes(status))
    return res.status(400).json({ error: "Status tidak valid." });
  const [bundle] = await db.update(tryoutBundlesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(tryoutBundlesTable.id, id)).returning();
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json(bundle);
});

/* DUPLICATE BUNDLE */
router.post("/admin/tryouts/:id/duplicate", async (req, res) => {
  const id = Number(req.params.id);
  const [original] = await db.select().from(tryoutBundlesTable).where(eq(tryoutBundlesTable.id, id));
  if (!original) return res.status(404).json({ error: "Bundle tidak ditemukan." });

  const [copy] = await db.insert(tryoutBundlesTable).values({
    name:            `${original.name} (Salinan)`,
    description:     original.description,
    category:        original.category,
    durationMinutes: original.durationMinutes,
    passingGrade:    original.passingGrade,
    settings:        original.settings as any,
    status:          "draft",
  }).returning();

  const sections = await db.select().from(tryoutSectionsTable)
    .where(eq(tryoutSectionsTable.tryoutId, id)).orderBy(tryoutSectionsTable.orderNum);

  for (const sec of sections) {
    const [newSec] = await db.insert(tryoutSectionsTable).values({
      tryoutId:         copy.id,
      name:             sec.name,
      category:         sec.category,
      orderNum:         sec.orderNum,
      timeLimitMinutes: sec.timeLimitMinutes,
      passingScore:     sec.passingScore,
    }).returning();

    const qs = await db.select().from(tryoutQuestionsTable)
      .where(eq(tryoutQuestionsTable.sectionId, sec.id));
    if (qs.length) {
      await db.insert(tryoutQuestionsTable).values(qs.map(q => ({
        tryoutId:      copy.id,
        sectionId:     newSec.id,
        orderNum:      q.orderNum,
        type:          q.type,
        content:       q.content,
        options:       q.options as any,
        correctAnswer: q.correctAnswer,
        explanation:   q.explanation,
        metadata:      q.metadata as any,
        scoreWeight:   q.scoreWeight,
      })));
    }
  }

  await syncCounts(copy.id);
  const [final] = await db.select().from(tryoutBundlesTable).where(eq(tryoutBundlesTable.id, copy.id));
  res.status(201).json(final);
});

/* DELETE BUNDLE */
router.delete("/admin/tryouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [bundle] = await db.delete(tryoutBundlesTable).where(eq(tryoutBundlesTable.id, id)).returning();
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });
  res.json({ success: true });
});

/* GET SINGLE QUESTION */
router.get("/admin/tryouts/:id/questions/:qid", async (req, res) => {
  const qid = Number(req.params.qid);
  const [q] = await db.select().from(tryoutQuestionsTable).where(eq(tryoutQuestionsTable.id, qid));
  if (!q) return res.status(404).json({ error: "Soal tidak ditemukan." });
  res.json(q);
});

/* CREATE QUESTION in a section */
router.post("/admin/tryouts/:id/sections/:sectionId/questions", async (req, res) => {
  const tryoutId  = Number(req.params.id);
  const sectionId = Number(req.params.sectionId);
  const { type, content, options, correctAnswer, explanation, metadata, scoreWeight } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Teks soal tidak boleh kosong." });

  const [maxRow] = await db.execute(sql`
    SELECT COALESCE(MAX(order_num), 0) AS max FROM tryout_questions WHERE section_id = ${sectionId}
  `);
  const nextOrder = Number((maxRow as any).max ?? 0) + 1;

  const [q] = await db.insert(tryoutQuestionsTable).values({
    tryoutId,
    sectionId,
    orderNum:      nextOrder,
    type:          type ?? "multiple_choice",
    content:       content.trim(),
    options:       options ?? null,
    correctAnswer: Array.isArray(correctAnswer) ? correctAnswer.join(",") : (correctAnswer ?? null),
    explanation:   explanation ?? null,
    metadata:      metadata ?? null,
    scoreWeight:   scoreWeight ?? 1,
  }).returning();

  await syncCounts(tryoutId);
  res.status(201).json(q);
});

/* UPDATE QUESTION */
router.put("/admin/tryouts/:id/questions/:qid", async (req, res) => {
  const tryoutId = Number(req.params.id);
  const qid      = Number(req.params.qid);
  const { type, content, options, correctAnswer, explanation, metadata, scoreWeight } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Teks soal tidak boleh kosong." });

  const [q] = await db.update(tryoutQuestionsTable).set({
    type:          type ?? "multiple_choice",
    content:       content.trim(),
    options:       options ?? null,
    correctAnswer: Array.isArray(correctAnswer) ? correctAnswer.join(",") : (correctAnswer ?? null),
    explanation:   explanation ?? null,
    metadata:      metadata ?? null,
    scoreWeight:   scoreWeight ?? 1,
  }).where(eq(tryoutQuestionsTable.id, qid)).returning();

  if (!q) return res.status(404).json({ error: "Soal tidak ditemukan." });
  await syncCounts(tryoutId);
  res.json(q);
});

/* DELETE QUESTION from a tryout */
router.delete("/admin/tryouts/:id/questions/:qid", async (req, res) => {
  const tryoutId = Number(req.params.id);
  const qid      = Number(req.params.qid);
  const [q] = await db
    .delete(tryoutQuestionsTable)
    .where(eq(tryoutQuestionsTable.id, qid))
    .returning();
  if (!q) return res.status(404).json({ error: "Soal tidak ditemukan." });
  await syncCounts(tryoutId);
  res.json({ success: true });
});

/* ═══════════════════════════════════════════════════════
   PREVIEW IMPORT (no DB write)
═══════════════════════════════════════════════════════ */
router.post("/admin/tryouts/preview", importLimiter, async (req, res) => {
  const { content, format = "json" } = req.body;
  if (!content) return res.status(400).json({ error: "Konten file diperlukan." });
  try {
    const parsed = parseTryoutBundle(content, format);
    const totalQ = parsed.sections.reduce((n, s) => n + s.questions.length, 0);
    const imageCount = parsed.sections.reduce((n, s) =>
      n + s.questions.reduce((m, q) => m + (q.content.match(/<img/gi)?.length ?? 0), 0), 0);
    res.json({
      name:          parsed.tryout.name,
      category:      parsed.tryout.category ?? null,
      durationMinutes: parsed.tryout.duration_minutes ?? 100,
      sectionCount:  parsed.sections.length,
      totalQuestions: totalQ,
      imageCount,
      errors:        parsed.errors,
      sections:      parsed.sections.map(s => ({
        name: s.name, category: s.category ?? null, questionCount: s.questions.length,
      })),
      preview: parsed.sections.flatMap(s => s.questions.slice(0, 3)).slice(0, 5).map(q => ({
        content: q.content.replace(/<[^>]*>/g, "").substring(0, 160),
        answer:  q.correct_answer ?? null,
      })),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Gagal memproses file." });
  }
});

/* ═══════════════════════════════════════════════════════
   IMPORT (parse + save)
═══════════════════════════════════════════════════════ */
router.post("/admin/tryouts/import", importLimiter, async (req, res) => {
  const { content, format = "json" } = req.body;
  if (!content) return res.status(400).json({ error: "Konten file diperlukan." });

  let parsed: ReturnType<typeof parseTryoutBundle>;
  try { parsed = parseTryoutBundle(content, format); }
  catch (err: any) { return res.status(400).json({ error: err.message }); }

  if (!parsed.tryout.name?.trim())
    return res.status(400).json({ error: "Nama tryout tidak ditemukan di file." });

  // Load global passing grades for auto-fill
  const globalPg = await getGlobalPassingGrades();

  const [bundle] = await db.insert(tryoutBundlesTable).values({
    name:            parsed.tryout.name.trim(),
    description:     parsed.tryout.description ?? null,
    category:        parsed.tryout.category ?? null,
    durationMinutes: parsed.tryout.duration_minutes ?? 100,
    passingGrade:    parsed.tryout.passing_grade ?? 0,
    settings:        parsed.tryout.settings ?? null,
    status:          "draft",
  }).returning();

  let totalImported = 0;
  for (const sec of parsed.sections) {
    // Auto-fill passingScore from global setting if not specified in the file
    const catKey = (sec.category ?? "").toUpperCase();
    const autoPassingScore = sec.passing_score ?? globalPg[catKey] ?? null;

    const [section] = await db.insert(tryoutSectionsTable).values({
      tryoutId:         bundle.id,
      name:             sec.name,
      category:         sec.category ?? null,
      orderNum:         sec.order ?? 1,
      timeLimitMinutes: sec.time_limit_minutes ?? null,
      passingScore:     autoPassingScore,
    }).returning();

    if (sec.questions.length) {
      await db.insert(tryoutQuestionsTable).values(sec.questions.map((q, i) => ({
        tryoutId:      bundle.id,
        sectionId:     section.id,
        orderNum:      q.order ?? i + 1,
        type:          q.type ?? "multiple_choice",
        content:       q.content,
        options:       q.options ?? null,
        correctAnswer: q.correct_answer ?? null,
        explanation:   q.explanation ?? null,
        metadata:      q.metadata ?? null,
        scoreWeight:   q.score_weight ?? 1,
      })));
      totalImported += sec.questions.length;
    }
  }

  await syncCounts(bundle.id);
  const [updated] = await db.select().from(tryoutBundlesTable).where(eq(tryoutBundlesTable.id, bundle.id));
  res.status(201).json({ bundle: updated, importedCount: totalImported, errors: parsed.errors });
});

/* ═══════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════ */
router.get("/admin/tryouts/:id/export", async (req, res) => {
  const id     = Number(req.params.id);
  const format = (req.query.format as string) ?? "json";

  const [bundle] = await db.select().from(tryoutBundlesTable).where(eq(tryoutBundlesTable.id, id));
  if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });

  const sections = await db.select().from(tryoutSectionsTable)
    .where(eq(tryoutSectionsTable.tryoutId, id)).orderBy(tryoutSectionsTable.orderNum);
  const questions = await db.select().from(tryoutQuestionsTable)
    .where(eq(tryoutQuestionsTable.tryoutId, id)).orderBy(tryoutQuestionsTable.orderNum);

  const sectionsWithQ = sections.map(s => ({
    ...s,
    questions: questions.filter(q => q.sectionId === s.id),
  }));

  const slug = bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  if (format === "html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tryout-${slug}.html"`);
    return res.send(exportHtml(bundle, sectionsWithQ));
  }

  const payload = {
    version: "1.0",
    type: "tryout_bundle",
    tryout: {
      name:             bundle.name,
      description:      bundle.description,
      category:         bundle.category,
      duration_minutes: bundle.durationMinutes,
      passing_grade:    bundle.passingGrade,
      settings:         bundle.settings,
      metadata:         { exported_at: new Date().toISOString() },
    },
    sections: sectionsWithQ.map(s => ({
      name:               s.name,
      category:           s.category,
      order:              s.orderNum,
      time_limit_minutes: s.timeLimitMinutes,
      passing_score:      s.passingScore,
      questions:          s.questions.map(q => ({
        order:          q.orderNum,
        type:           q.type,
        content:        q.content,
        options:        q.options,
        correct_answer: q.correctAnswer,
        explanation:    q.explanation,
        metadata:       q.metadata,
        score_weight:   q.scoreWeight,
      })),
    })),
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="tryout-${slug}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

/* ═══════════════════════════════════════════════════════
   PARSER HELPERS
═══════════════════════════════════════════════════════ */
interface ParsedSection {
  name: string; category?: string; order?: number;
  time_limit_minutes?: number; passing_score?: number;
  questions: ParsedQuestion[];
}
interface ParsedQuestion {
  order?: number; type?: string; content: string;
  options?: any; correct_answer?: string; explanation?: string;
  metadata?: any; score_weight?: number;
}
interface ParsedBundle {
  tryout: { name: string; description?: string; category?: string;
            duration_minutes?: number; passing_grade?: number; settings?: any; };
  sections: ParsedSection[];
  errors: { section: string; index: number; message: string }[];
}

function parseTryoutBundle(content: string, format: string): ParsedBundle {
  if (format === "json") return parseJsonBundle(content);
  if (format === "html") return parseHtmlBundle(content);
  throw new Error("Format tidak didukung.");
}

function parseJsonBundle(raw: string): ParsedBundle {
  let doc: any;
  try { doc = JSON.parse(raw); } catch { throw new Error("JSON tidak valid."); }
  if (!doc.tryout || !doc.sections)
    throw new Error("Struktur JSON tidak sesuai. Wajib ada field 'tryout' dan 'sections'.");

  const errors: ParsedBundle["errors"] = [];
  const sections: ParsedSection[] = (doc.sections as any[]).map((sec: any, si: number) => {
    const qs: ParsedQuestion[] = [];
    ((sec.questions ?? []) as any[]).forEach((q: any, qi: number) => {
      if (!q.content && !q.text) {
        errors.push({ section: sec.name ?? `Seksi ${si + 1}`, index: qi + 1, message: "Field 'content' kosong." });
        return;
      }
      qs.push({
        order:          q.order ?? qi + 1,
        type:           q.type ?? "multiple_choice",
        content:        q.content ?? q.text,
        options:        q.options ?? null,
        correct_answer: q.correct_answer ?? q.correctAnswer ?? null,
        explanation:    q.explanation ?? null,
        metadata:       q.metadata ?? null,
        score_weight:   q.score_weight ?? 1,
      });
    });
    return { name: sec.name ?? `Seksi ${si + 1}`, category: sec.category, order: sec.order ?? si + 1,
             time_limit_minutes: sec.time_limit_minutes, passing_score: sec.passing_score, questions: qs };
  });

  return { tryout: doc.tryout, sections, errors };
}

function parseHtmlBundle(raw: string): ParsedBundle {
  const errors: ParsedBundle["errors"] = [];
  const meta = (name: string) => raw.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, "i"))?.[1];

  const tryout = {
    name:             meta("name") ?? "Bundle Tryout",
    description:      meta("description"),
    category:         meta("category"),
    duration_minutes: Number(meta("duration") ?? 100),
    passing_grade:    Number(meta("passing_grade") ?? 0),
  };

  const sections: ParsedSection[] = [];
  const secRx = /<section[^>]*class="[^"]*tryout-section[^"]*"[^>]*>([\s\S]*?)<\/section>/gi;
  let sm: RegExpExecArray | null;
  let si = 0;
  while ((sm = secRx.exec(raw)) !== null) {
    si++;
    const body    = sm[1];
    const secName = body.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]?.replace(/<[^>]*>/g,"").trim()
                 ?? meta(`section-${si}-name`) ?? `Seksi ${si}`;
    const secCat  = body.match(/<[^>]*data-category="([^"]*)"[^>]*>/i)?.[1];
    const qs: ParsedQuestion[] = [];
    const qRx = /<div[^>]*class="[^"]*question[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*question|<\/section)/gi;
    let qm: RegExpExecArray | null; let qi = 0;
    while ((qm = qRx.exec(body)) !== null) {
      qi++;
      const qBody   = qm[1];
      const content = qBody.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
      if (!content.trim()) { errors.push({ section: secName, index: qi, message: "Konten soal kosong." }); continue; }
      const opts: any[] = [];
      const olRx = /<li[^>]*data-key="([A-Ea-e])"[^>]*>([\s\S]*?)<\/li>/gi;
      let om: RegExpExecArray | null;
      while ((om = olRx.exec(qBody)) !== null)
        opts.push({ key: om[1].toUpperCase(), text: om[2].replace(/<[^>]*>/g,"").trim() });
      const ans = qBody.match(/<[^>]*data-key="([A-Ea-e])"[^>]*class="[^"]*answer[^"]*"/i)?.[1]?.toUpperCase()
               ?? qBody.match(/<[^>]*class="[^"]*answer[^"]*"[^>]*data-key="([A-Ea-e])"/i)?.[1]?.toUpperCase();
      qs.push({ order: qi, type: "multiple_choice", content,
                options: opts.length ? opts : null, correct_answer: ans ?? null, explanation: null });
    }
    sections.push({ name: secName, category: secCat, order: si, questions: qs });
  }

  if (si === 0) throw new Error("Tidak ditemukan seksi. Gunakan <section class=\"tryout-section\">.");
  return { tryout, sections, errors };
}

/* ── HTML Exporter ──────────────────────────────────────── */
function exportHtml(bundle: any, sections: any[]): string {
  const esc = (s: string) => String(s ?? "").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const secHtml = sections.map(s => {
    const qs = s.questions.map((q: any) => {
      const opts = Array.isArray(q.options)
        ? `<ol class="options">\n${q.options.map((o: any) => `      <li data-key="${o.key}">${o.text}</li>`).join("\n")}\n    </ol>` : "";
      return `  <div class="question">
    <div class="content">${q.content}</div>
    ${opts}
    <div class="answer" data-key="${q.correctAnswer ?? ""}"></div>
    <div class="explanation">${q.explanation ?? ""}</div>
  </div>`;
    }).join("\n\n");
    return `<section class="tryout-section" data-category="${esc(s.category ?? "")}">
  <h2>${esc(s.name)}</h2>
${qs}
</section>`;
  }).join("\n\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="format"        content="cpns-tryout-bundle-v1" />
  <meta name="name"          content="${esc(bundle.name)}" />
  <meta name="category"      content="${esc(bundle.category ?? "")}" />
  <meta name="description"   content="${esc(bundle.description ?? "")}" />
  <meta name="duration"      content="${bundle.durationMinutes}" />
  <meta name="passing_grade" content="${bundle.passingGrade}" />
  <title>${esc(bundle.name)}</title>
</head>
<body>
<article class="tryout-bundle">
${secHtml}
</article>
</body>
</html>`;
}

export default router;
