import { Router } from "express";
import { db } from "@workspace/db";
import {
  tryoutBundlesTable, tryoutSectionsTable, tryoutQuestionsTable,
  tryoutSessionsTable, tryoutResultsTable, userSubscriptionsTable,
  appSettingsTable,
} from "@workspace/db";
import { eq, and, desc, sql, gt } from "drizzle-orm";

const router = Router();

/* ── Auth guard ── */
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Login diperlukan." });
  next();
}

/* ── Helper: does this user have an active subscription? ── */
async function hasActiveSub(userId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(userSubscriptionsTable)
    .where(
      and(
        eq(userSubscriptionsTable.userId, userId),
        eq(userSubscriptionsTable.status, "active"),
        gt(userSubscriptionsTable.expiresAt, new Date()),
      )
    )
    .limit(1);
  return rows.length > 0;
}

/* ── Helper: build tryout card from DB rows ── */
function buildTryoutCard(tryout: any, sections: any[]) {
  const comp = { TWK: 0, TIU: 0, TKP: 0 };
  const pass = { TWK: 0, TIU: 0, TKP: 0, total: tryout.passingGrade };

  for (const s of sections) {
    const cat = (s.category ?? "").toUpperCase() as keyof typeof comp;
    if (cat in comp) {
      comp[cat] += s.questionCount ?? 0;
      if (s.passingScore) pass[cat] = s.passingScore;
    }
  }

  return {
    id: String(tryout.id),
    title: tryout.name,
    description: tryout.description ?? "",
    duration: tryout.durationMinutes,
    composition: comp,
    passingScore: pass,
    isAccessibleFree: tryout.isFree,
    status: tryout.status,
    totalQuestions: tryout.totalQuestions,
    settings: tryout.settings,
  };
}

/* ─────────────────────────────────────────────
   GET /participant/passing-grades  (no admin auth)
   Returns global passing grades from app_settings
────────────────────────────────────────────── */
router.get("/passing-grades", requireAuth, async (_req, res) => {
  try {
    const defaults = { TWK: 65, TIU: 80, TKP: 166 };
    const [row] = await db
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "passing_grades"));
    let grades = defaults;
    if (row?.value) {
      try { grades = { ...defaults, ...JSON.parse(row.value) }; } catch {}
    }
    return res.json({ grades });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/tryouts
   List published tryouts with lock status
────────────────────────────────────────────── */
router.get("/tryouts", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId;
    const premium = await hasActiveSub(userId);

    const tryouts = await db
      .select()
      .from(tryoutBundlesTable)
      .where(eq(tryoutBundlesTable.status, "published"))
      .orderBy(tryoutBundlesTable.id);

    const sections = tryouts.length === 0 ? [] : await db
      .select()
      .from(tryoutSectionsTable)
      .where(
        sql`${tryoutSectionsTable.tryoutId} IN (${sql.join(tryouts.map(t => sql`${t.id}`), sql`, `)})`
      );

    const cards = tryouts.map(t => {
      const secs = sections.filter(s => s.tryoutId === t.id);
      return { ...buildTryoutCard(t, secs), hasPremium: premium };
    });

    return res.json({ tryouts: cards });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/tryouts/:id
────────────────────────────────────────────── */
router.get("/tryouts/:id", requireAuth, async (req: any, res) => {
  try {
    const [tryout] = await db
      .select()
      .from(tryoutBundlesTable)
      .where(eq(tryoutBundlesTable.id, Number(req.params.id)));

    if (!tryout || tryout.status !== "published") {
      return res.status(404).json({ error: "Tryout tidak ditemukan." });
    }

    const sections = await db
      .select()
      .from(tryoutSectionsTable)
      .where(eq(tryoutSectionsTable.tryoutId, tryout.id));

    return res.json({ tryout: buildTryoutCard(tryout, sections) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   POST /participant/tryouts/:id/sessions
   Start a new session (or resume in-progress one)
────────────────────────────────────────────── */
router.post("/tryouts/:id/sessions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;
    const tryoutId = Number(req.params.id);

    const [tryout] = await db
      .select()
      .from(tryoutBundlesTable)
      .where(eq(tryoutBundlesTable.id, tryoutId));

    if (!tryout || tryout.status !== "published") {
      return res.status(404).json({ error: "Tryout tidak ditemukan." });
    }

    // Access gate: if not free, need active subscription
    if (!tryout.isFree) {
      const premium = await hasActiveSub(userId);
      if (!premium) {
        return res.status(403).json({ error: "Tryout ini memerlukan langganan aktif." });
      }
    }

    // Check for existing in-progress session
    const existing = await db
      .select()
      .from(tryoutSessionsTable)
      .where(
        and(
          eq(tryoutSessionsTable.userId, userId),
          eq(tryoutSessionsTable.tryoutId, tryoutId),
          eq(tryoutSessionsTable.status, "in_progress"),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.json({ session: existing[0] });
    }

    // Create new session
    const [session] = await db
      .insert(tryoutSessionsTable)
      .values({
        userId,
        tryoutId,
        status: "in_progress",
        answers: {},
        flagged: [],
        timeRemaining: tryout.durationMinutes * 60,
      })
      .returning();

    return res.status(201).json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/sessions/:sessionId
   Get session state + questions
────────────────────────────────────────────── */
router.get("/sessions/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    const [session] = await db
      .select()
      .from(tryoutSessionsTable)
      .where(eq(tryoutSessionsTable.id, req.params.sessionId));

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Sesi tidak ditemukan." });
    }

    // Get questions with sections
    const questions = await db
      .select({
        id:            tryoutQuestionsTable.id,
        orderNum:      tryoutQuestionsTable.orderNum,
        type:          tryoutQuestionsTable.type,
        content:       tryoutQuestionsTable.content,
        options:       tryoutQuestionsTable.options,
        correctAnswer: tryoutQuestionsTable.correctAnswer,
        explanation:   tryoutQuestionsTable.explanation,
        scoreWeight:   tryoutQuestionsTable.scoreWeight,
        sectionId:     tryoutQuestionsTable.sectionId,
        sectionName:   tryoutSectionsTable.name,
        sectionCat:    tryoutSectionsTable.category,
      })
      .from(tryoutQuestionsTable)
      .innerJoin(tryoutSectionsTable, eq(tryoutQuestionsTable.sectionId, tryoutSectionsTable.id))
      .where(eq(tryoutQuestionsTable.tryoutId, session.tryoutId))
      .orderBy(tryoutSectionsTable.orderNum, tryoutQuestionsTable.orderNum);

    // Map to frontend-compatible shape
    const mappedQuestions = questions.map(q => ({
      id: String(q.id),
      text: q.content,
      categoryId: (q.sectionCat ?? "").toUpperCase(),
      sectionName: q.sectionName,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? "",
      scoreWeight: q.scoreWeight,
    }));

    // Session with string id answers/flags
    const sessionData = {
      ...session,
      answers: session.answers as Record<string, string>,
      flagged: session.flagged as string[],
    };

    return res.json({ session: sessionData, questions: mappedQuestions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   PUT /participant/sessions/:sessionId/answer
   Body: { questionId, answer }
────────────────────────────────────────────── */
router.put("/sessions/:sessionId/answer", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;
    const { questionId, answer } = req.body;

    const [session] = await db
      .select()
      .from(tryoutSessionsTable)
      .where(eq(tryoutSessionsTable.id, req.params.sessionId));

    if (!session || session.userId !== userId || session.status !== "in_progress") {
      return res.status(404).json({ error: "Sesi tidak valid." });
    }

    const currentAnswers = (session.answers as Record<string, string>) ?? {};
    const updated = { ...currentAnswers, [String(questionId)]: answer };

    await db
      .update(tryoutSessionsTable)
      .set({ answers: updated })
      .where(eq(tryoutSessionsTable.id, session.id));

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   PUT /participant/sessions/:sessionId/flag/:qid
   Toggle flag for a question
────────────────────────────────────────────── */
router.put("/sessions/:sessionId/flag/:qid", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    const [session] = await db
      .select()
      .from(tryoutSessionsTable)
      .where(eq(tryoutSessionsTable.id, req.params.sessionId));

    if (!session || session.userId !== userId || session.status !== "in_progress") {
      return res.status(404).json({ error: "Sesi tidak valid." });
    }

    const current = (session.flagged as string[]) ?? [];
    const qid = req.params.qid;
    const updated = current.includes(qid) ? current.filter(id => id !== qid) : [...current, qid];

    await db
      .update(tryoutSessionsTable)
      .set({ flagged: updated })
      .where(eq(tryoutSessionsTable.id, session.id));

    return res.json({ ok: true, flagged: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   POST /participant/sessions/:sessionId/submit
   Score + save result
────────────────────────────────────────────── */
router.post("/sessions/:sessionId/submit", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    const [session] = await db
      .select()
      .from(tryoutSessionsTable)
      .where(eq(tryoutSessionsTable.id, req.params.sessionId));

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Sesi tidak ditemukan." });
    }
    if (session.status === "completed") {
      // Already submitted — return existing result
      const [existing] = await db
        .select()
        .from(tryoutResultsTable)
        .where(eq(tryoutResultsTable.sessionId, session.id));
      if (existing) return res.json({ result: existing });
    }

    // Load questions + sections
    const questions = await db
      .select({
        id:            tryoutQuestionsTable.id,
        correctAnswer: tryoutQuestionsTable.correctAnswer,
        scoreWeight:   tryoutQuestionsTable.scoreWeight,
        options:       tryoutQuestionsTable.options,
        sectionCat:    tryoutSectionsTable.category,
        passingScore:  tryoutSectionsTable.passingScore,
      })
      .from(tryoutQuestionsTable)
      .innerJoin(tryoutSectionsTable, eq(tryoutQuestionsTable.sectionId, tryoutSectionsTable.id))
      .where(eq(tryoutQuestionsTable.tryoutId, session.tryoutId));

    const [tryout] = await db
      .select()
      .from(tryoutBundlesTable)
      .where(eq(tryoutBundlesTable.id, session.tryoutId));

    const answers = (session.answers as Record<string, string>) ?? {};
    const settings = (tryout.settings as any) ?? {};
    const sectionsScoring = settings?.sections_scoring ?? {};

    let twkScore = 0, tiuScore = 0, tkpScore = 0;
    let twkCorrect = 0, tiuCorrect = 0, tkpCorrect = 0;

    for (const q of questions) {
      const cat = (q.sectionCat ?? "").toUpperCase();
      const userAns = answers[String(q.id)];
      if (!userAns) continue;

      if (cat === "TKP") {
        // TKP: score from option weight
        const opts = Array.isArray(q.options) ? q.options as any[] : [];
        const opt = opts.find((o: any) => o.key === userAns);
        const weight = opt?.weight ?? q.scoreWeight ?? 1;
        tkpScore += weight;
        tkpCorrect++;
      } else {
        // TWK / TIU: correct = 5 pts
        const pts = sectionsScoring?.[cat]?.correct ?? 5;
        if (userAns === q.correctAnswer) {
          if (cat === "TWK") { twkScore += pts; twkCorrect++; }
          else                { tiuScore += pts; tiuCorrect++; }
        }
      }
    }

    const totalScore = twkScore + tiuScore + tkpScore;

    // Determine pass/fail: all category passing scores must be met
    const sections = await db
      .select()
      .from(tryoutSectionsTable)
      .where(eq(tryoutSectionsTable.tryoutId, session.tryoutId));

    const twkPG = sections.find(s => s.category?.toUpperCase() === "TWK")?.passingScore ?? 65;
    const tiuPG = sections.find(s => s.category?.toUpperCase() === "TIU")?.passingScore ?? 80;
    const tkpPG = sections.find(s => s.category?.toUpperCase() === "TKP")?.passingScore ?? 166;
    const totalPG = tryout.passingGrade ?? 311;

    const passed = twkScore >= twkPG && tiuScore >= tiuPG && tkpScore >= tkpPG && totalScore >= totalPG;

    // Calculate rank (how many users have a higher total score for this tryout)
    const rankRow = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(tryoutResultsTable)
      .where(
        and(
          eq(tryoutResultsTable.tryoutId, session.tryoutId),
          gt(tryoutResultsTable.totalScore, totalScore)
        )
      );
    const rank = Number(rankRow[0]?.cnt ?? 0) + 1;

    // Save result
    const [result] = await db
      .insert(tryoutResultsTable)
      .values({
        sessionId: session.id,
        userId,
        tryoutId: session.tryoutId,
        twkScore, tiuScore, tkpScore,
        totalScore,
        twkCorrect, tiuCorrect, tkpCorrect,
        totalQuestions: questions.length,
        passed,
        rank,
      })
      .returning();

    // Mark session completed
    await db
      .update(tryoutSessionsTable)
      .set({ status: "completed", submittedAt: new Date() })
      .where(eq(tryoutSessionsTable.id, session.id));

    return res.json({ result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/results
   List all results for current user
────────────────────────────────────────────── */
router.get("/results", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    const results = await db
      .select({
        id:             tryoutResultsTable.id,
        sessionId:      tryoutResultsTable.sessionId,
        tryoutId:       tryoutResultsTable.tryoutId,
        tryoutName:     tryoutBundlesTable.name,
        twkScore:       tryoutResultsTable.twkScore,
        tiuScore:       tryoutResultsTable.tiuScore,
        tkpScore:       tryoutResultsTable.tkpScore,
        totalScore:     tryoutResultsTable.totalScore,
        totalQuestions: tryoutResultsTable.totalQuestions,
        passed:         tryoutResultsTable.passed,
        rank:           tryoutResultsTable.rank,
        createdAt:      tryoutResultsTable.createdAt,
      })
      .from(tryoutResultsTable)
      .innerJoin(tryoutBundlesTable, eq(tryoutResultsTable.tryoutId, tryoutBundlesTable.id))
      .where(eq(tryoutResultsTable.userId, userId))
      .orderBy(desc(tryoutResultsTable.createdAt));

    const mapped = results.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      tryoutId: String(r.tryoutId),
      tryoutName: r.tryoutName,
      score: { TWK: r.twkScore, TIU: r.tiuScore, TKP: r.tkpScore, total: r.totalScore },
      passed: r.passed,
      rank: r.rank ?? 0,
      totalParticipants: 0,
      completedAt: r.createdAt,
    }));

    return res.json({ results: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/results/:sessionId
   Result for a specific session
────────────────────────────────────────────── */
router.get("/results/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    const [result] = await db
      .select({
        id:             tryoutResultsTable.id,
        sessionId:      tryoutResultsTable.sessionId,
        tryoutId:       tryoutResultsTable.tryoutId,
        tryoutName:     tryoutBundlesTable.name,
        twkScore:       tryoutResultsTable.twkScore,
        tiuScore:       tryoutResultsTable.tiuScore,
        tkpScore:       tryoutResultsTable.tkpScore,
        totalScore:     tryoutResultsTable.totalScore,
        totalQuestions: tryoutResultsTable.totalQuestions,
        passed:         tryoutResultsTable.passed,
        rank:           tryoutResultsTable.rank,
        createdAt:      tryoutResultsTable.createdAt,
      })
      .from(tryoutResultsTable)
      .innerJoin(tryoutBundlesTable, eq(tryoutResultsTable.tryoutId, tryoutBundlesTable.id))
      .where(
        and(
          eq(tryoutResultsTable.sessionId, req.params.sessionId),
          eq(tryoutResultsTable.userId, userId),
        )
      );

    if (!result) return res.status(404).json({ error: "Hasil tidak ditemukan." });

    // Total participants who submitted this tryout
    const [totRow] = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(tryoutResultsTable)
      .where(eq(tryoutResultsTable.tryoutId, result.tryoutId));
    const totalParticipants = Number(totRow?.cnt ?? 1);

    return res.json({
      result: {
        id: result.id,
        sessionId: result.sessionId,
        tryoutId: String(result.tryoutId),
        tryoutName: result.tryoutName,
        score: { TWK: result.twkScore, TIU: result.tiuScore, TKP: result.tkpScore, total: result.totalScore },
        passed: result.passed,
        rank: result.rank ?? 0,
        totalParticipants,
        completedAt: result.createdAt,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/dashboard
────────────────────────────────────────────── */
router.get("/dashboard", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;

    // Results for this user
    const results = await db
      .select({
        totalScore: tryoutResultsTable.totalScore,
        tryoutName: tryoutBundlesTable.name,
        createdAt:  tryoutResultsTable.createdAt,
      })
      .from(tryoutResultsTable)
      .innerJoin(tryoutBundlesTable, eq(tryoutResultsTable.tryoutId, tryoutBundlesTable.id))
      .where(eq(tryoutResultsTable.userId, userId))
      .orderBy(tryoutResultsTable.createdAt);

    const totalTryoutsDone = results.length;
    const averageScore = totalTryoutsDone
      ? Math.round(results.reduce((s, r) => s + r.totalScore, 0) / totalTryoutsDone)
      : 0;
    const scoreHistory = results.map(r => ({ tryout: r.tryoutName, score: r.totalScore }));

    // Rank = count of distinct users with higher average score
    let rank = 0;
    if (totalTryoutsDone > 0) {
      const rankRow = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) AS cnt
        FROM tryout_results
        WHERE user_id != ${userId}
        GROUP BY user_id
        HAVING AVG(total_score) > ${averageScore}
      `);
      rank = (rankRow.rows?.length ?? 0) + 1;
    }

    // Subscription
    const [sub] = await db
      .select()
      .from(userSubscriptionsTable)
      .where(
        and(
          eq(userSubscriptionsTable.userId, userId),
          eq(userSubscriptionsTable.status, "active"),
        )
      )
      .orderBy(desc(userSubscriptionsTable.expiresAt))
      .limit(1);

    const daysLeft = sub
      ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000))
      : 0;

    return res.json({
      dashboard: {
        totalTryoutsDone,
        averageScore,
        rank,
        subscriptionName: sub?.planName ?? null,
        subscriptionDaysLeft: daysLeft,
        scoreHistory,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/ranking?tryoutId=123
────────────────────────────────────────────── */
router.get("/ranking", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;
    const tryoutId = req.query.tryoutId ? Number(req.query.tryoutId) : null;

    let rankingRows: any[];

    if (tryoutId) {
      rankingRows = await db.execute(sql`
        SELECT
          tr.user_id,
          u.full_name,
          tr.total_score,
          tr.twk_score,
          tr.tiu_score,
          tr.tkp_score,
          tr.created_at
        FROM tryout_results tr
        JOIN users u ON u.id = tr.user_id
        WHERE tr.tryout_id = ${tryoutId}
        ORDER BY tr.total_score DESC
        LIMIT 100
      `).then(r => r.rows);
    } else {
      rankingRows = await db.execute(sql`
        SELECT
          tr.user_id,
          u.full_name,
          AVG(tr.total_score)::int AS total_score,
          AVG(tr.twk_score)::int   AS twk_score,
          AVG(tr.tiu_score)::int   AS tiu_score,
          AVG(tr.tkp_score)::int   AS tkp_score,
          MAX(tr.created_at) AS created_at
        FROM tryout_results tr
        JOIN users u ON u.id = tr.user_id
        GROUP BY tr.user_id, u.full_name
        ORDER BY total_score DESC
        LIMIT 100
      `).then(r => r.rows);
    }

    const ranking = rankingRows.map((row: any, idx: number) => ({
      rank: idx + 1,
      userId: row.user_id,
      userName: row.full_name,
      total: row.total_score,
      TWK: row.twk_score,
      TIU: row.tiu_score,
      TKP: row.tkp_score,
      date: row.created_at,
      isMe: row.user_id === userId,
    }));

    return res.json({ ranking });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/review?sessionId=xxx
   Questions from a completed session with user answers
────────────────────────────────────────────── */
router.get("/review", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;
    const sessionId = req.query.sessionId as string | undefined;

    let session: any;
    if (sessionId) {
      [session] = await db
        .select()
        .from(tryoutSessionsTable)
        .where(and(eq(tryoutSessionsTable.id, sessionId), eq(tryoutSessionsTable.userId, userId)));
    } else {
      [session] = await db
        .select()
        .from(tryoutSessionsTable)
        .where(and(eq(tryoutSessionsTable.userId, userId), eq(tryoutSessionsTable.status, "completed")))
        .orderBy(desc(tryoutSessionsTable.submittedAt))
        .limit(1);
    }

    if (!session) return res.json({ questions: [], sessionId: null });

    const questions = await db
      .select({
        id:            tryoutQuestionsTable.id,
        content:       tryoutQuestionsTable.content,
        options:       tryoutQuestionsTable.options,
        correctAnswer: tryoutQuestionsTable.correctAnswer,
        explanation:   tryoutQuestionsTable.explanation,
        sectionCat:    tryoutSectionsTable.category,
      })
      .from(tryoutQuestionsTable)
      .innerJoin(tryoutSectionsTable, eq(tryoutQuestionsTable.sectionId, tryoutSectionsTable.id))
      .where(eq(tryoutQuestionsTable.tryoutId, session.tryoutId))
      .orderBy(tryoutSectionsTable.orderNum, tryoutQuestionsTable.orderNum);

    const answers = (session.answers as Record<string, string>) ?? {};
    const mapped = questions.map(q => ({
      id: String(q.id),
      text: q.content,
      categoryId: (q.sectionCat ?? "").toUpperCase(),
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? "",
      userAnswer: answers[String(q.id)] ?? null,
      isCorrect: !!q.correctAnswer && answers[String(q.id)] === q.correctAnswer,
    }));

    return res.json({ questions: mapped, sessionId: session.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /participant/tryout-review/:sessionId
   Full question-by-question review with passing grade per section
────────────────────────────────────────────── */
router.get("/tryout-review/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId as string;
    const sessionId = req.params.sessionId as string;

    // Verify session belongs to this user and is completed
    const [session] = await db
      .select()
      .from(tryoutSessionsTable)
      .where(and(eq(tryoutSessionsTable.id, sessionId), eq(tryoutSessionsTable.userId, userId)));

    if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan." });
    if (session.status !== "completed") return res.status(400).json({ error: "Sesi belum selesai." });

    // Get result for scores
    const [result] = await db
      .select()
      .from(tryoutResultsTable)
      .where(and(eq(tryoutResultsTable.sessionId, sessionId), eq(tryoutResultsTable.userId, userId)));

    if (!result) return res.status(404).json({ error: "Hasil tidak ditemukan." });

    // Get tryout name
    const [tryout] = await db
      .select({ name: tryoutBundlesTable.name, passingGrade: tryoutBundlesTable.passingGrade })
      .from(tryoutBundlesTable)
      .where(eq(tryoutBundlesTable.id, session.tryoutId));

    // Get sections with passingScore
    const sections = await db
      .select()
      .from(tryoutSectionsTable)
      .where(eq(tryoutSectionsTable.tryoutId, session.tryoutId))
      .orderBy(tryoutSectionsTable.orderNum);

    // Get all questions with section info
    const questions = await db
      .select({
        id:            tryoutQuestionsTable.id,
        orderNum:      tryoutQuestionsTable.orderNum,
        content:       tryoutQuestionsTable.content,
        options:       tryoutQuestionsTable.options,
        correctAnswer: tryoutQuestionsTable.correctAnswer,
        explanation:   tryoutQuestionsTable.explanation,
        scoreWeight:   tryoutQuestionsTable.scoreWeight,
        sectionId:     tryoutSectionsTable.id,
        sectionName:   tryoutSectionsTable.name,
        sectionCat:    tryoutSectionsTable.category,
        passingScore:  tryoutSectionsTable.passingScore,
      })
      .from(tryoutQuestionsTable)
      .innerJoin(tryoutSectionsTable, eq(tryoutQuestionsTable.sectionId, tryoutSectionsTable.id))
      .where(eq(tryoutQuestionsTable.tryoutId, session.tryoutId))
      .orderBy(tryoutSectionsTable.orderNum, tryoutQuestionsTable.orderNum);

    const answers = (session.answers as Record<string, string>) ?? {};

    // Build section summaries
    const sectionScoreMap: Record<number, number> = {
      // Pre-fill from result
    };

    // Map category to score from result
    const catScoreMap: Record<string, number> = {
      TWK: result.twkScore,
      TIU: result.tiuScore,
      TKP: result.tkpScore,
    };

    const sectionSummaries = sections.map(s => {
      const cat = (s.category ?? "").toUpperCase();
      const score = catScoreMap[cat] ?? 0;
      const pg = s.passingScore ?? null;
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        score,
        passingScore: pg,
        passed: pg !== null ? score >= pg : null,
        questionCount: s.questionCount,
      };
    });

    // Build question list with user answers
    const mappedQuestions = questions.map(q => {
      const userAns = answers[String(q.id)] ?? null;
      const cat = (q.sectionCat ?? "").toUpperCase();
      let isCorrect: boolean | null = null;
      if (cat === "TKP") {
        // TKP: any answer counts as attempted, no single "correct" answer
        isCorrect = userAns !== null;
      } else {
        isCorrect = userAns !== null && userAns === q.correctAnswer;
      }
      return {
        id:            String(q.id),
        orderNum:      q.orderNum,
        content:       q.content,
        options:       Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer,
        explanation:   q.explanation ?? "",
        sectionId:     q.sectionId,
        sectionName:   q.sectionName,
        sectionCat:    (q.sectionCat ?? "").toUpperCase(),
        userAnswer:    userAns,
        isCorrect,
        skipped:       userAns === null,
      };
    });

    return res.json({
      tryout: {
        name:         tryout.name,
        passingGrade: tryout.passingGrade,
      },
      result: {
        twkScore:   result.twkScore,
        tiuScore:   result.tiuScore,
        tkpScore:   result.tkpScore,
        totalScore: result.totalScore,
        passed:     result.passed,
        rank:       result.rank ?? 0,
        completedAt: result.createdAt,
      },
      sections: sectionSummaries,
      questions: mappedQuestions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export { router as participantTryoutRouter };
