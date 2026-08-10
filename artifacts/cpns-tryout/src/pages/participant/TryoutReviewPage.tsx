import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import {
  CheckCircle2, XCircle, ArrowLeft, BookOpen, Filter,
  ChevronDown, ChevronUp, Trophy, Target, Clock,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────── */
interface SectionSummary {
  id: number;
  name: string;
  category: string | null;
  score: number;
  passingScore: number | null;
  passed: boolean | null;
  questionCount: number;
}

interface Question {
  id: string;
  orderNum: number;
  content: string;
  options: { key: string; text?: string; weight?: number }[];
  correctAnswer: string | null;
  explanation: string;
  sectionId: number;
  sectionName: string;
  sectionCat: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  skipped: boolean;
}

interface ReviewData {
  tryout: { name: string; passingGrade: number };
  result: {
    twkScore: number; tiuScore: number; tkpScore: number;
    totalScore: number; passed: boolean; rank: number; completedAt: string;
  };
  sections: SectionSummary[];
  questions: Question[];
}

/* ─── Single question card ──────────────────────────── */
function QuestionCard({ q, num }: { q: Question; num: number }) {
  const [open, setOpen] = useState(false);
  const isTKP = q.sectionCat === "TKP";

  const statusColor = q.skipped
    ? "border-slate-200 bg-white"
    : isTKP
    ? "border-blue-200 bg-blue-50/30"
    : q.isCorrect
    ? "border-emerald-200 bg-emerald-50/30"
    : "border-red-200 bg-red-50/30";

  return (
    <div className={`rounded-xl border ${statusColor} overflow-hidden transition-all`}>
      {/* Question header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {q.skipped ? (
            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">—</span>
          ) : isTKP ? (
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-blue-600" />
            </span>
          ) : q.isCorrect ? (
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={14} className="text-emerald-600" />
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={14} className="text-red-600" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-slate-400">#{num}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: q.sectionCat === "TWK" ? "#dbeafe" : q.sectionCat === "TIU" ? "#fef9c3" : "#dcfce7",
                       color: q.sectionCat === "TWK" ? "#1d4ed8" : q.sectionCat === "TIU" ? "#a16207" : "#15803d" }}>
              {q.sectionCat}
            </span>
            {q.skipped && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">Tidak Dijawab</span>
            )}
          </div>
          <div
            className="text-sm text-slate-800 line-clamp-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: q.content }}
          />
        </div>

        <div className="shrink-0 text-slate-400">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
          {/* Full question */}
          <div className="prose prose-sm max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: q.content }} />

          {/* Options */}
          {q.options.length > 0 && (
            <div className="space-y-2 mt-2">
              {q.options.map(opt => {
                const isUser    = q.userAnswer === opt.key;
                const isCorrect = q.correctAnswer === opt.key;
                let cls = "flex items-start gap-2 px-3 py-2 rounded-lg text-sm border transition-colors";
                if (!isTKP && isCorrect) cls += " bg-emerald-50 border-emerald-300 font-semibold text-emerald-800";
                else if (isUser && !isTKP && !isCorrect) cls += " bg-red-50 border-red-300 font-semibold text-red-800";
                else if (isUser && isTKP) cls += " bg-blue-50 border-blue-300 font-semibold text-blue-800";
                else cls += " bg-white border-slate-200 text-slate-700";
                return (
                  <div key={opt.key} className={cls}>
                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                      border-current">{opt.key}</span>
                    <span className="flex-1 q-html" dangerouslySetInnerHTML={{ __html:
                      (opt.text ?? "") + (isTKP && opt.weight !== undefined ? `<span class="ml-2 text-xs text-slate-400">(${opt.weight} poin)</span>` : "")
                    }} />
                    {!isTKP && isCorrect && (
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                    )}
                    {isUser && !isTKP && !isCorrect && (
                      <XCircle size={14} className="shrink-0 text-red-500 mt-0.5" />
                    )}
                    {isUser && isTKP && (
                      <CheckCircle2 size={14} className="shrink-0 text-blue-500 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* User answer summary */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-1">
            <span>
              <strong>Jawaban Anda:</strong>{" "}
              {q.userAnswer
                ? <span className={!isTKP && !q.isCorrect ? "text-red-600 font-bold" : "text-emerald-700 font-bold"}>{q.userAnswer}</span>
                : <span className="text-slate-400 italic">Tidak dijawab</span>}
            </span>
            {!isTKP && q.correctAnswer && (
              <span>
                <strong>Jawaban Benar:</strong>{" "}
                <span className="text-emerald-700 font-bold">{q.correctAnswer}</span>
              </span>
            )}
          </div>

          {/* Explanation */}
          {q.explanation && (
            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-1">Pembahasan:</p>
              <div className="prose prose-sm max-w-none text-slate-700 text-sm"
                dangerouslySetInnerHTML={{ __html: q.explanation }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────── */
export function TryoutReviewPage() {
  const [, params] = useRoute("/tryout/:sessionId/review");
  const [, setLocation] = useLocation();
  const sessionId = params?.sessionId ?? "";

  const [data, setData]     = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter]   = useState<"ALL" | "BENAR" | "SALAH" | "LEWAT">("ALL");

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/participant/tryout-review/${sessionId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Gagal memuat data review."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-8 text-center text-red-500">
          {error ?? "Data tidak tersedia."}
        </div>
      </DashboardLayout>
    );
  }

  const { tryout, result, sections, questions } = data;

  // Unique section categories for filter tabs
  const cats = ["ALL", ...Array.from(new Set(sections.map(s => (s.category ?? "").toUpperCase()).filter(Boolean)))];

  // Apply filters
  const filtered = questions.filter(q => {
    if (sectionFilter !== "ALL" && q.sectionCat !== sectionFilter) return false;
    if (statusFilter === "BENAR") return q.isCorrect === true;
    if (statusFilter === "SALAH") return q.isCorrect === false && !q.skipped;
    if (statusFilter === "LEWAT") return q.skipped;
    return true;
  });

  const correctCount  = questions.filter(q => q.isCorrect === true).length;
  const wrongCount    = questions.filter(q => q.isCorrect === false && !q.skipped).length;
  const skippedCount  = questions.filter(q => q.skipped).length;

  const catLabels: Record<string, string> = {
    TWK: "Tes Wawasan Kebangsaan",
    TIU: "Tes Intelegensi Umum",
    TKP: "Tes Karakteristik Pribadi",
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">

        {/* Back nav */}
        <button
          onClick={() => setLocation("/hasil")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Kembali ke Riwayat
        </button>

        {/* ── Summary banner ── */}
        <div className={`p-6 md:p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6
          ${result.passed ? "bg-emerald-600" : "bg-red-600"}`}>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {result.passed
                ? <CheckCircle2 size={40} />
                : <XCircle size={40} />}
            </div>
            <div>
              <div className="text-white/80 text-sm font-bold uppercase tracking-wider mb-0.5">Review Tryout</div>
              <div className="text-2xl md:text-3xl font-black">{tryout.name}</div>
              <div className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
                <Clock size={13} />
                {new Date(result.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/15 rounded-xl px-4 py-3">
              <div className="text-3xl font-black">{result.totalScore}</div>
              <div className="text-white/80 text-xs font-medium mt-0.5">Skor Total</div>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-3">
              <div className="text-3xl font-black text-emerald-200">{correctCount}</div>
              <div className="text-white/80 text-xs font-medium mt-0.5">Benar</div>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-3">
              <div className="text-3xl font-black text-red-200">{wrongCount}</div>
              <div className="text-white/80 text-xs font-medium mt-0.5">Salah</div>
            </div>
          </div>
        </div>

        {/* ── Section breakdown cards ── */}
        <div>
          <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Target size={17} className="text-primary" /> Breakdown per Seksi
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {sections.map(s => {
              const cat = (s.category ?? "").toUpperCase();
              const pct = s.passingScore ? Math.min(100, (s.score / s.passingScore) * 100) : 0;
              const hasPg = s.passingScore !== null;
              return (
                <div key={s.id} className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-bold text-slate-800">{cat || s.name}</span>
                      {catLabels[cat] && (
                        <div className="text-[11px] text-slate-400">{catLabels[cat]}</div>
                      )}
                    </div>
                    {hasPg && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        s.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {s.passed ? "✓ LULUS" : "✗ TIDAK LULUS"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 mb-1.5 flex items-end justify-between">
                    <span className={`text-2xl font-black ${
                      hasPg ? (s.passed ? "text-emerald-600" : "text-red-500") : "text-slate-800"}`}>
                      {s.score}
                    </span>
                    {hasPg && (
                      <span className="text-xs text-slate-400">PG: <strong>{s.passingScore}</strong></span>
                    )}
                  </div>
                  {hasPg && (
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${s.passed ? "bg-emerald-500" : "bg-red-400"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 mt-1.5">{s.questionCount} soal</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Question list ── */}
        <div>
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
              <BookOpen size={17} className="text-primary" /> Daftar Soal
              <span className="text-slate-400 font-normal text-sm">({filtered.length} soal)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* Section filter */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {cats.map(c => (
                  <button key={c} type="button"
                    onClick={() => setSectionFilter(c)}
                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={sectionFilter === c
                      ? { background: "#1E4D9C", color: "#fff" }
                      : { background: "#fff", color: "#475569" }}>
                    {c === "ALL" ? "Semua" : c}
                  </button>
                ))}
              </div>
              {/* Status filter */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(["ALL", "BENAR", "SALAH", "LEWAT"] as const).map(f => (
                  <button key={f} type="button"
                    onClick={() => setStatusFilter(f)}
                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={statusFilter === f
                      ? { background: f === "BENAR" ? "#059669" : f === "SALAH" ? "#dc2626" : f === "LEWAT" ? "#64748b" : "#1E4D9C", color: "#fff" }
                      : { background: "#fff", color: "#475569" }}>
                    {f === "ALL" ? "Semua" : f === "BENAR" ? `✓ Benar (${correctCount})` : f === "SALAH" ? `✗ Salah (${wrongCount})` : `— Lewat (${skippedCount})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Filter size={32} className="mx-auto mb-3 opacity-40" />
              Tidak ada soal sesuai filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q, idx) => (
                <QuestionCard key={q.id} q={q} num={idx + 1} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setLocation("/hasil")}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Kembali ke Riwayat
          </button>
          <button
            onClick={() => setLocation("/tryout")}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            <Trophy size={16} /> Tryout Lagi
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
