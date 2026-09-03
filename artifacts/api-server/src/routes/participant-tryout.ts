import { Router } from "express";
import { db } from "@workspace/db";
import {
  tryoutBundlesTable, tryoutSectionsTable, tryoutQuestionsTable,
  tryoutSessionsTable, tryoutResultsTable, userSubscriptionsTable,
  appSettingsTable,
} from "@workspace/db";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { countDummyAbove, totalDummyCount } from "../lib/dummy-scores";

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
    // Gunakan name sebagai fallback jika category tidak ada / tidak cocok
    const cat = ((s.category || s.name) ?? "").toUpperCase() as keyof typeof comp;
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
      // Paket gratis selalu tampil paling awal, baru urutan manual (drag & drop admin)
      .orderBy(desc(tryoutBundlesTable.isFree), tryoutBundlesTable.sortOrder, tryoutBundlesTable.id);

    const sections = tryouts.length === 0 ? [] : await db
      .select()
      .from(tryoutSectionsTable)
      .where(
        sql`${tryoutSectionsTable.tryoutId} IN (${sql.join(tryouts.map(t => sql`${t.id}`), sql`, `)})`
      );

    // Ambil hasil terakhir per tryout untuk user ini (termasuk rank)
    const tryoutIds = tryouts.map(t => t.id);
    let lastResultMap: Record<string, any> = {};
    if (tryoutIds.length) {
      const inClause = sql.join(tryoutIds.map(id => sql`${id}`), sql`, `);

      const [results, dummyTotal, countRows] = await Promise.all([
        db.select({
          tryoutId:   tryoutResultsTable.tryoutId,
          sessionId:  tryoutResultsTable.sessionId,
          totalScore: tryoutResultsTable.totalScore,
          twkScore:   tryoutResultsTable.twkScore,
          tiuScore:   tryoutResultsTable.tiuScore,
          tkpScore:   tryoutResultsTable.tkpScore,
          passed:     tryoutResultsTable.passed,
          rank:       tryoutResultsTable.rank,
          createdAt:  tryoutResultsTable.createdAt,
        })
          .from(tryoutResultsTable)
          .where(and(
            eq(tryoutResultsTable.userId, userId),
            sql`${tryoutResultsTable.tryoutId} IN (${inClause})`
          ))
          .orderBy(desc(tryoutResultsTable.createdAt)),

        totalDummyCount(),

        db.execute(sql`
          SELECT tryout_id, COUNT(*)::int AS cnt
          FROM tryout_results
          WHERE tryout_id IN (${inClause})
          GROUP BY tryout_id
        `),
      ]);

      const countMap: Record<string, number> = {};
      for (const row of countRows.rows as any[]) {
        countMap[String(row.tryout_id)] = Number(row.cnt) + dummyTotal;
      }

      // Simpan hanya hasil terbaru per tryout
      for (const r of results) {
        const key = String(r.tryoutId);
        if (!lastResultMap[key]) {
          lastResultMap[key] = {
            sessionId:  r.sessionId,
            totalScore: r.totalScore,
            twkScore:   r.twkScore,
            tiuScore:   r.tiuScore,
            tkpScore:   r.tkpScore,
            passed:     r.passed,
            rank:       r.rank ?? 0,
            totalParticipants: countMap[key] ?? dummyTotal + 1,
            completedAt: r.createdAt,
          };
        }
      }
    }

    const cards = tryouts.map(t => {
      const secs = sections.filter(s => s.tryoutId === t.id);
      return {
        ...buildTryoutCard(t, secs),
        hasPremium: premium,
        lastResult: lastResultMap[String(t.id)] ?? null,
      };
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

    const force = req.body?.force === true || req.query?.force === "true";

    if (!force) {
      // Check for existing in-progress session (resume)
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
         metadata:      tryoutQuestionsTable.metadata,
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
       metadata: q.metadata ?? null,
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

    // Calculate rank: (real users with higher score) + (dummy scores higher) + 1
    const [rankRow, dummyAbove] = await Promise.all([
      db.select({ cnt: sql<number>`count(*)` })
        .from(tryoutResultsTable)
        .where(and(
          eq(tryoutResultsTable.tryoutId, session.tryoutId),
          gt(tryoutResultsTable.totalScore, totalScore),
        )),
      countDummyAbove(totalScore),
    ]);
    const rank = Number(rankRow[0]?.cnt ?? 0) + dummyAbove + 1;

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

    const dummyTotal = await totalDummyCount();

    // Per-tryout real participant counts in one query
    const tryoutIds = [...new Set(results.map(r => r.tryoutId).filter(Boolean))];
    let countMap: Record<string, number> = {};
    if (tryoutIds.length) {
      const inClause = sql.join(tryoutIds.map(id => sql`${id}`), sql`, `);
      const countRows = await db.execute(sql`
        SELECT tryout_id, COUNT(*)::int AS cnt
        FROM tryout_results
        WHERE tryout_id IN (${inClause})
        GROUP BY tryout_id
      `);
      for (const row of countRows.rows as any[]) {
        countMap[String(row.tryout_id)] = Number(row.cnt) + dummyTotal;
      }
    }

    const mapped = results.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      tryoutId: String(r.tryoutId),
      tryoutName: r.tryoutName,
      score: { TWK: r.twkScore, TIU: r.tiuScore, TKP: r.tkpScore, total: r.totalScore },
      passed: r.passed,
      rank: r.rank ?? 0,
      totalParticipants: countMap[String(r.tryoutId)] ?? dummyTotal + 1,
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

    // Total participants: real + dummy pool
    const [[totRow], dummyTotal] = await Promise.all([
      db.select({ cnt: sql<number>`count(*)` })
        .from(tryoutResultsTable)
        .where(eq(tryoutResultsTable.tryoutId, result.tryoutId)),
      totalDummyCount(),
    ]);
    const totalParticipants = Number(totRow?.cnt ?? 1) + dummyTotal;

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

    // Rank = distinct users with higher avg score + dummy scores above avg + 1
    let rank = 0;
    if (totalTryoutsDone > 0) {
      const [rankRow, dummyAbove] = await Promise.all([
        db.execute(sql`
          SELECT COUNT(DISTINCT user_id) AS cnt
          FROM tryout_results
          WHERE user_id != ${userId}
          GROUP BY user_id
          HAVING AVG(total_score) > ${averageScore}
        `),
        countDummyAbove(averageScore),
      ]);
      rank = (rankRow.rows?.length ?? 0) + dummyAbove + 1;
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
   GET /participant/ranking?tryoutId=<uuid>
   Mengembalikan:
   - ranking[]      : top-100 user nyata
   - myActualRank   : rank user termasuk dummy pool
   - totalParticipants: user nyata + dummy total
   - distribution[] : histogram untuk chart
────────────────────────────────────────────── */
router.get("/ranking", requireAuth, async (req: any, res) => {
  try {
    const userId   = req.session.userId as string;
    const tryoutId = req.query.tryoutId as string | undefined;

    // ── Top-100 leaderboard (peserta nyata + peserta simulasi digabung) ────
    let realRows: any[];
    if (tryoutId) {
      realRows = await db.execute(sql`
        SELECT tr.user_id, u.full_name,
               tr.total_score, tr.twk_score, tr.tiu_score, tr.tkp_score, tr.created_at
        FROM tryout_results tr
        JOIN users u ON u.id = tr.user_id
        WHERE tr.tryout_id = ${tryoutId}
        ORDER BY tr.total_score DESC
        LIMIT 100
      `).then(r => r.rows);
    } else {
      realRows = await db.execute(sql`
        SELECT tr.user_id, u.full_name,
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

    // Kandidat dummy dengan skor tertinggi — cukup untuk mengisi sisa slot
    // top-100 setelah digabung dan diurutkan ulang dengan peserta nyata.
    const dummyRows = await db.execute(sql`
      SELECT id, name, score, created_at
      FROM dummy_scores
      ORDER BY score DESC
      LIMIT 150
    `).then(r => r.rows as any[]);

    const combinedRows = [
      ...realRows.map((row: any) => ({
        userId:   row.user_id as string,
        userName: row.full_name as string,
        total:    Number(row.total_score),
        TWK:      Number(row.twk_score),
        TIU:      Number(row.tiu_score),
        TKP:      Number(row.tkp_score),
        date:     row.created_at,
        isDummy:  false,
      })),
      ...dummyRows.map((row: any) => {
        // Skor dummy hanya berupa total — pecah proporsional ke TWK/TIU/TKP
        // (skala SKD: TWK maks 150, TIU maks 175, TKP maks 225 dari total 550)
        // hanya untuk keperluan tampilan.
        const total = Number(row.score);
        const twk   = Math.round((total * 150) / 550);
        const tiu   = Math.round((total * 175) / 550);
        const tkp   = Math.max(0, total - twk - tiu);
        return {
          userId:   `dummy-${row.id}`,
          userName: row.name ?? `Peserta ${row.id}`,
          total, TWK: twk, TIU: tiu, TKP: tkp,
          date:     row.created_at,
          isDummy:  true,
        };
      }),
    ]
      .sort((a, b) => b.total - a.total)
      .slice(0, 100);

    const ranking = combinedRows.map((row, idx) => ({
      rank:     idx + 1,
      userId:   row.userId,
      userName: row.userName,
      total:    row.total,
      TWK:      row.TWK,
      TIU:      row.TIU,
      TKP:      row.TKP,
      date:     row.date,
      isMe:     !row.isDummy && row.userId === userId,
    }));

    // ── Skor user saat ini (untuk hitung rank sebenarnya) ──────────────────
    let myScore = 0;
    if (tryoutId) {
      const [myRow] = await db.execute(sql`
        SELECT total_score FROM tryout_results
        WHERE user_id = ${userId} AND tryout_id = ${tryoutId}
        ORDER BY total_score DESC LIMIT 1
      `).then(r => r.rows as any[]);
      myScore = myRow?.total_score ?? 0;
    } else {
      const [myRow] = await db.execute(sql`
        SELECT AVG(total_score)::int AS total_score
        FROM tryout_results WHERE user_id = ${userId}
      `).then(r => r.rows as any[]);
      myScore = myRow?.total_score ?? 0;
    }

    // ── Rank sebenarnya: real lebih tinggi + dummy lebih tinggi + 1 ────────
    let myActualRank = 0;
    let totalParticipants = 0;
    if (myScore > 0) {
      const [realAbove, dummyAbove, realTotal, dummyTotal] = await Promise.all([
        tryoutId
          ? db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS cnt FROM tryout_results WHERE tryout_id = ${tryoutId} AND total_score > ${myScore}`).then(r => Number((r.rows[0] as any)?.cnt ?? 0))
          : db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS cnt FROM (SELECT user_id, AVG(total_score) AS avg_score FROM tryout_results GROUP BY user_id HAVING AVG(total_score) > ${myScore}) x`).then(r => Number((r.rows[0] as any)?.cnt ?? 0)),
        countDummyAbove(myScore),
        tryoutId
          ? db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS cnt FROM tryout_results WHERE tryout_id = ${tryoutId}`).then(r => Number((r.rows[0] as any)?.cnt ?? 0))
          : db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS cnt FROM tryout_results`).then(r => Number((r.rows[0] as any)?.cnt ?? 0)),
        totalDummyCount(),
      ]);
      myActualRank    = realAbove + dummyAbove + 1;
      totalParticipants = realTotal + dummyTotal;
    }

    // ── Distribusi histogram (dummy + user nyata, bucket 50 poin) ──────────
    const buckets = [
      { range: "0–149",   min: 0,   max: 149 },
      { range: "150–199", min: 150, max: 199 },
      { range: "200–249", min: 200, max: 249 },
      { range: "250–299", min: 250, max: 299 },
      { range: "300–349", min: 300, max: 349 },
      { range: "350–399", min: 350, max: 399 },
      { range: "400–449", min: 400, max: 449 },
      { range: "450–550", min: 450, max: 550 },
    ];
    const distRows = await db.execute(sql`
      SELECT score AS s FROM dummy_scores
      UNION ALL
      SELECT total_score AS s FROM tryout_results
    `).then(r => (r.rows as any[]).map(r => Number(r.s)));

    const distribution = buckets.map(b => ({
      range: b.range,
      count: distRows.filter(s => s >= b.min && s <= b.max).length,
    }));

    return res.json({ ranking, myActualRank, myScore, totalParticipants, distribution });
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
         metadata:      tryoutQuestionsTable.metadata,
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
       metadata: q.metadata ?? null,
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
         metadata:      tryoutQuestionsTable.metadata,
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
         metadata:      q.metadata ?? null,
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
