import { Router } from "express";
import { db } from "@workspace/db";
import { questionBundlesTable, questionsTable, practiceSessionsTable } from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

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

/* ─────────────────────────────────────────────
   POST /bundles/:id/submit
   Save a completed practice session
────────────────────────────────────────────── */
router.post("/bundles/:id/submit", requireAuth, async (req: any, res) => {
  try {
    const bundleId = Number(req.params.id);
    if (isNaN(bundleId)) return res.status(400).json({ error: "ID tidak valid." });

    const userId = req.session.userId as string;
    const { answers } = req.body as { answers: Record<string, string> };

    if (!answers || typeof answers !== "object")
      return res.status(400).json({ error: "Data jawaban tidak valid." });

    // Fetch questions to compute correctCount
    const rows = await db
      .select({ id: questionsTable.id, correctAnswer: questionsTable.correctAnswer })
      .from(questionsTable)
      .where(eq(questionsTable.bundleId, bundleId));

    const totalQuestions = rows.length;
    const correctCount = rows.filter(
      q => answers[String(q.id)] && answers[String(q.id)] === q.correctAnswer
    ).length;

    const [session] = await db.insert(practiceSessionsTable).values({
      userId,
      bundleId,
      answers,
      totalQuestions,
      correctCount,
    }).returning();

    return res.status(201).json({ session, correctCount, totalQuestions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /history
   List all bundles the user has completed practice for
────────────────────────────────────────────── */
router.get("/history", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    // Get latest session per bundle using DISTINCT ON
    const result = await db.execute(sql`
      SELECT DISTINCT ON (ps.bundle_id)
        ps.id            AS session_id,
        ps.bundle_id,
        ps.total_questions,
        ps.correct_count,
        ps.completed_at,
        qb.name          AS bundle_name,
        qb.description   AS bundle_description,
        qb.category      AS bundle_category,
        qb.question_count
      FROM practice_sessions ps
      JOIN question_bundles qb ON qb.id = ps.bundle_id
      WHERE ps.user_id = ${userId}
      ORDER BY ps.bundle_id, ps.completed_at DESC
    `);

    // db.execute returns { rows: [...] } in drizzle-orm/node-postgres
    const rows = (result as any).rows ?? result ?? [];

    const history = (rows as any[]).map(r => ({
      sessionId:         r.session_id,
      bundleId:          r.bundle_id,
      bundleName:        r.bundle_name,
      bundleDescription: r.bundle_description ?? "",
      bundleCategory:    r.bundle_category ?? "Lainnya",
      questionCount:     r.question_count,
      totalQuestions:    r.total_questions,
      correctCount:      r.correct_count,
      completedAt:       r.completed_at,
    }));

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /history/:bundleId
   Questions + user answers for the latest session of a bundle
────────────────────────────────────────────── */
router.get("/history/:bundleId", requireAuth, async (req: any, res) => {
  try {
    const bundleId = Number(req.params.bundleId);
    const userId   = req.session.userId as string;

    if (isNaN(bundleId)) return res.status(400).json({ error: "ID tidak valid." });

    // Get most recent session
    const [session] = await db
      .select()
      .from(practiceSessionsTable)
      .where(
        and(
          eq(practiceSessionsTable.userId, userId),
          eq(practiceSessionsTable.bundleId, bundleId),
        )
      )
      .orderBy(desc(practiceSessionsTable.completedAt))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Belum ada sesi latihan untuk bundle ini." });

    const [bundle] = await db
      .select()
      .from(questionBundlesTable)
      .where(eq(questionBundlesTable.id, bundleId));

    if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });

    const rows = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.bundleId, bundleId))
      .orderBy(asc(questionsTable.orderNum));

    const userAnswers = session.answers as Record<string, string>;

    const questions = rows.map(q => {
      const qId        = String(q.id);
      const userAnswer = userAnswers[qId] ?? null;
      const isCorrect  = userAnswer !== null && userAnswer === q.correctAnswer;
      return {
        id:            qId,
        text:          q.content,
        categoryId:    bundle.category ?? "Lainnya",
        options:       Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer ?? null,
        explanation:   q.explanation ?? "",
        userAnswer,
        isCorrect,
      };
    });

    return res.json({
      bundle: {
        id:          String(bundle.id),
        name:        bundle.name,
        category:    bundle.category ?? "Lainnya",
        description: bundle.description ?? "",
      },
      session: {
        id:             session.id,
        correctCount:   session.correctCount,
        totalQuestions: session.totalQuestions,
        completedAt:    session.completedAt,
      },
      questions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export { router as participantPracticeRouter };
