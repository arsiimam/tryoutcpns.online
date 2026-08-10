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

    // Enforce published-only gate (same as /bundles/:id/questions)
    const [bundle] = await db
      .select({ id: questionBundlesTable.id })
      .from(questionBundlesTable)
      .where(and(eq(questionBundlesTable.id, bundleId), eq(questionBundlesTable.status, "published")));
    if (!bundle) return res.status(404).json({ error: "Bundle tidak ditemukan." });

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
   Latest session per bundle + session count
────────────────────────────────────────────── */
router.get("/history", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    // Simple query: all sessions ordered by latest first, dedup by bundle in JS
    const [sessionsResult, countsResult] = await Promise.all([
      db
        .select({
          sessionId:    practiceSessionsTable.id,
          bundleId:     practiceSessionsTable.bundleId,
          totalQuestions: practiceSessionsTable.totalQuestions,
          correctCount: practiceSessionsTable.correctCount,
          completedAt:  practiceSessionsTable.completedAt,
          bundleName:        questionBundlesTable.name,
          bundleDescription: questionBundlesTable.description,
          bundleCategory:    questionBundlesTable.category,
          questionCount:     questionBundlesTable.questionCount,
        })
        .from(practiceSessionsTable)
        .innerJoin(questionBundlesTable, eq(practiceSessionsTable.bundleId, questionBundlesTable.id))
        .where(eq(practiceSessionsTable.userId, userId))
        .orderBy(desc(practiceSessionsTable.completedAt)),

      db.execute(sql`
        SELECT bundle_id, COUNT(*)::int AS cnt
        FROM practice_sessions
        WHERE user_id = ${userId}
        GROUP BY bundle_id
      `),
    ]);

    // Count per bundle
    const countRows = (countsResult as any).rows ?? countsResult ?? [];
    const sessionCountMap: Record<number, number> = {};
    for (const row of countRows as any[]) {
      sessionCountMap[Number(row.bundle_id)] = Number(row.cnt);
    }

    // Dedup: keep latest session per bundle
    const seen = new Set<number>();
    const history = [];
    for (const r of sessionsResult) {
      if (seen.has(r.bundleId)) continue;
      seen.add(r.bundleId);
      history.push({
        sessionId:         r.sessionId,
        bundleId:          r.bundleId,
        bundleName:        r.bundleName,
        bundleDescription: r.bundleDescription ?? "",
        bundleCategory:    r.bundleCategory ?? "Lainnya",
        questionCount:     r.questionCount,
        totalQuestions:    r.totalQuestions,
        correctCount:      r.correctCount,
        completedAt:       r.completedAt,
        sessionCount:      sessionCountMap[r.bundleId] ?? 1,
      });
    }

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /history/:bundleId/sessions
   All session metadata for a bundle (no questions)
────────────────────────────────────────────── */
router.get("/history/:bundleId/sessions", requireAuth, async (req: any, res) => {
  try {
    const bundleId = Number(req.params.bundleId);
    const userId   = req.session.userId as string;
    if (isNaN(bundleId)) return res.status(400).json({ error: "ID tidak valid." });

    const result = await db.execute(sql`
      SELECT ps.id, ps.correct_count, ps.total_questions, ps.completed_at
      FROM practice_sessions ps
      WHERE ps.user_id = ${userId} AND ps.bundle_id = ${bundleId}
      ORDER BY ps.completed_at DESC
    `);
    const rows = (result as any).rows ?? result ?? [];
    const sessions = (rows as any[]).map(r => ({
      id:             r.id,
      correctCount:   r.correct_count,
      totalQuestions: r.total_questions,
      completedAt:    r.completed_at,
    }));
    return res.json({ sessions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /history/:bundleId
   Questions + user answers for a session of a bundle.
   Optional ?sessionId=<uuid> to pick a specific session;
   defaults to the most recent session.
────────────────────────────────────────────── */
router.get("/history/:bundleId", requireAuth, async (req: any, res) => {
  try {
    const bundleId  = Number(req.params.bundleId);
    const userId    = req.session.userId as string;
    const sessionId = req.query.sessionId as string | undefined;

    if (isNaN(bundleId)) return res.status(400).json({ error: "ID tidak valid." });

    // Get specific session or most recent
    let session: any;
    if (sessionId) {
      [session] = await db
        .select()
        .from(practiceSessionsTable)
        .where(and(eq(practiceSessionsTable.id, sessionId), eq(practiceSessionsTable.userId, userId)));
    } else {
      [session] = await db
        .select()
        .from(practiceSessionsTable)
        .where(and(eq(practiceSessionsTable.userId, userId), eq(practiceSessionsTable.bundleId, bundleId)))
        .orderBy(desc(practiceSessionsTable.completedAt))
        .limit(1);
    }

    if (!session) return res.status(404).json({ error: "Belum ada sesi latihan untuk bundle ini." });

    // Enforce published-only gate for review detail as well
    const [bundle] = await db
      .select()
      .from(questionBundlesTable)
      .where(and(eq(questionBundlesTable.id, bundleId), eq(questionBundlesTable.status, "published")));

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
