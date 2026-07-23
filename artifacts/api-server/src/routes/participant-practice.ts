import { Router } from "express";
import { db } from "@workspace/db";
import { questionBundlesTable, questionsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Login diperlukan." });
  next();
}

/* ─────────────────────────────────────────────
   GET /bundles
   List all published question bundles
────────────────────────────────────────────── */
router.get("/bundles", requireAuth, async (_req: any, res) => {
  try {
    const bundles = await db
      .select({
        id:            questionBundlesTable.id,
        name:          questionBundlesTable.name,
        description:   questionBundlesTable.description,
        category:      questionBundlesTable.category,
        questionCount: questionBundlesTable.questionCount,
        status:        questionBundlesTable.status,
      })
      .from(questionBundlesTable)
      .where(eq(questionBundlesTable.status, "published"))
      .orderBy(questionBundlesTable.category, asc(questionBundlesTable.id));

    return res.json({ bundles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /bundles/:id/questions
   Get all questions for a specific bundle
────────────────────────────────────────────── */
router.get("/bundles/:id/questions", requireAuth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid." });

    const [bundle] = await db
      .select()
      .from(questionBundlesTable)
      .where(
        and(
          eq(questionBundlesTable.id, id),
          eq(questionBundlesTable.status, "published"),
        ),
      );

    if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });

    const rows = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.bundleId, id))
      .orderBy(asc(questionsTable.orderNum));

    const questions = rows.map((q) => ({
      id:            String(q.id),
      text:          q.content,
      options:       Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer ?? null,
      explanation:   q.explanation ?? "",
      difficulty:    (q.metadata as any)?.difficulty ?? "sedang",
    }));

    return res.json({
      bundle: {
        id:            String(bundle.id),
        name:          bundle.name,
        description:   bundle.description ?? "",
        category:      bundle.category ?? "Lainnya",
        questionCount: bundle.questionCount,
      },
      questions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export { router as participantPracticeRouter };
