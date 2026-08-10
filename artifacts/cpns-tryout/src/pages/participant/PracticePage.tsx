// @refresh reset
import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutGrid,
  Loader2,
  Send,
} from "lucide-react";
import { useLocation } from "wouter";

/* ── Types ────────────────────────────────── */
interface BundleInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  questionCount: number;
}

interface PracticeQuestion {
  id: string;
  text: string;
  options: { key: string; text: string }[];
  correctAnswer: string | null;
  explanation: string;
  difficulty: "mudah" | "sedang" | "sulit";
}

/* ── Category style map ───────────────────── */
interface CatMeta {
  code: string; name: string; description: string;
  color: string; bgColor: string; borderColor: string; badgeClass: string;
}

const KNOWN_CATS: Record<string, CatMeta> = {
  TWK: {
    code: "TWK", name: "Tes Wawasan Kebangsaan",
    description: "Soal wawasan kebangsaan, Pancasila, UUD 1945, dan NKRI",
    color: "text-blue-700", bgColor: "bg-blue-50",
    borderColor: "border-blue-200", badgeClass: "bg-blue-100 text-blue-800",
  },
  TIU: {
    code: "TIU", name: "Tes Intelegensi Umum",
    description: "Soal logika, matematika, verbal, analogi, dan figural",
    color: "text-purple-700", bgColor: "bg-purple-50",
    borderColor: "border-purple-200", badgeClass: "bg-purple-100 text-purple-800",
  },
  TKP: {
    code: "TKP", name: "Tes Karakteristik Pribadi",
    description: "Soal sikap, perilaku, dan karakteristik kepribadian ASN",
    color: "text-emerald-700", bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200", badgeClass: "bg-emerald-100 text-emerald-800",
  },
  SKD: {
    code: "SKD", name: "Seleksi Kompetensi Dasar",
    description: "Paket gabungan TWK + TIU + TKP",
    color: "text-indigo-700", bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200", badgeClass: "bg-indigo-100 text-indigo-800",
  },
  SKB: {
    code: "SKB", name: "Seleksi Kompetensi Bidang",
    description: "Soal kompetensi bidang jabatan yang dilamar",
    color: "text-rose-700", bgColor: "bg-rose-50",
    borderColor: "border-rose-200", badgeClass: "bg-rose-100 text-rose-800",
  },
};

const FALLBACK_COLORS = [
  { color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", badgeClass: "bg-amber-100 text-amber-800" },
  { color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", badgeClass: "bg-cyan-100 text-cyan-800" },
  { color: "text-teal-700", bgColor: "bg-teal-50", borderColor: "border-teal-200", badgeClass: "bg-teal-100 text-teal-800" },
];

function getCatMeta(cat: string, fallbackIdx = 0): CatMeta {
  const key = cat.toUpperCase();
  if (KNOWN_CATS[key]) return KNOWN_CATS[key];
  const fb = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
  return {
    code: key || "—", name: cat || "Lainnya",
    description: "Kumpulan soal latihan",
    ...fb,
  };
}

/* ── Sub-components ───────────────────────── */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cls =
    difficulty === "mudah" ? "bg-green-100 text-green-700"
    : difficulty === "sulit" ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  const label =
    difficulty === "mudah" ? "Mudah" : difficulty === "sulit" ? "Sulit" : "Sedang";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

/* ── Main Page ────────────────────────────── */
type View = "selection" | "loading" | "session" | "submitting";

export function PracticePage() {
  const [bundles, setBundles] = useState<BundleInfo[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(true);

  const [view, setView] = useState<View>("selection");
  const [selectedBundle, setSelectedBundle] = useState<BundleInfo | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── Fetch bundles on mount ── */
  useEffect(() => {
    fetch("/api/participant/practice/bundles", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBundles(d.bundles ?? []))
      .catch(() => {})
      .finally(() => setLoadingBundles(false));
  }, []);

  /* ── Group bundles by category ── */
  const grouped = bundles.reduce<Record<string, BundleInfo[]>>((acc, b) => {
    const key = b.category?.toUpperCase() || "Lainnya";
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {});

  /* ── Start practice for a bundle ── */
  const startBundle = async (bundle: BundleInfo) => {
    setView("loading");
    setSelectedBundle(bundle);
    try {
      const r = await fetch(`/api/participant/practice/bundles/${bundle.id}/questions`, {
        credentials: "include",
      });
      const d = await r.json();
      setQuestions(d.questions ?? []);
      setCurrentIndex(0);
      setAnswers({});
      setShowAnswers(false);
      setView("session");
    } catch {
      setView("selection");
    }
  };

  const [, navigate] = useLocation();

  const exitSession = () => {
    setView("selection");
    setSelectedBundle(null);
    setQuestions([]);
  };

  const submitSession = async () => {
    if (!selectedBundle || Object.keys(answers).length === 0) {
      exitSession();
      return;
    }
    setView("submitting");
    setSubmitError(null);
    try {
      const r = await fetch(`/api/participant/practice/bundles/${selectedBundle.id}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (r.ok) {
        navigate(`/review/${selectedBundle.id}`);
      } else {
        const d = await r.json().catch(() => ({}));
        setSubmitError(d.error ?? `Gagal menyimpan sesi (${r.status}). Coba lagi.`);
        setView("session");
      }
    } catch {
      setSubmitError("Koneksi bermasalah. Coba lagi.");
      setView("session");
    }
  };

  /* ════════════════════════════════════════════
     SELECTION VIEW
  ════════════════════════════════════════════ */
  if (view === "selection" || view === "loading") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Latihan Soal</h1>
          <p className="text-slate-500 mt-1">
            Pilih bundle soal latihan. Kerjakan tanpa batas waktu dan cek jawaban langsung.
          </p>
        </div>

        {loadingBundles ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-semibold text-slate-700 text-lg">Belum ada bundle soal tersedia</p>
            <p className="text-slate-400 text-sm mt-1">
              Admin belum mempublikasikan bundle soal latihan. Cek lagi nanti.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {Object.entries(grouped).map(([catKey, catBundles], catIdx) => {
              const meta = getCatMeta(catKey, catIdx);
              return (
                <div
                  key={catKey}
                  className={`rounded-2xl border ${meta.borderColor} ${meta.bgColor} p-6`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 ${meta.borderColor} bg-white ${meta.color}`}
                    >
                      {meta.code}
                    </div>
                    <div>
                      <h2 className={`font-bold text-lg ${meta.color}`}>{meta.name}</h2>
                      <p className="text-sm text-slate-500">{meta.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catBundles.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => startBundle(b)}
                        disabled={view === "loading"}
                        className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-4 text-left group disabled:opacity-60 disabled:cursor-wait"
                      >
                        <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${meta.color}`}>
                          {meta.code}
                        </div>
                        <div className="font-bold text-slate-800 text-base mb-1 group-hover:text-slate-900 line-clamp-2 leading-snug">
                          {b.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <BookOpen size={14} />
                          {b.questionCount ?? "?"} soal · Tanpa timer
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardLayout>
    );
  }

  /* ════════════════════════════════════════════
     SESSION VIEW
  ════════════════════════════════════════════ */
  if (!selectedBundle || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const q = questions[currentIndex];
  const meta = getCatMeta(selectedBundle.category);
  const userAns = answers[q.id];
  const isCorrect = userAns === q.correctAnswer;
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;

  return (
    <DashboardLayout>
      {/* ── Session Header ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={exitSession}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} /> Kembali
        </button>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${meta.bgColor} ${meta.borderColor} border`}
        >
          <span className={`font-bold text-sm ${meta.color}`}>{meta.code}</span>
          <span className="text-slate-400">·</span>
          <span className="text-sm text-slate-600 font-medium max-w-[200px] truncate">
            {selectedBundle.name}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">
            {answeredCount}/{total} dijawab
          </span>

          <button
            onClick={() => setShowAnswers((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
              showAnswers
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {showAnswers ? <EyeOff size={15} /> : <Eye size={15} />}
            {showAnswers ? "Sembunyikan Jawaban" : "Tampilkan Jawaban"}
          </button>

          <button
            onClick={() => setShowNav((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-all"
          >
            <LayoutGrid size={15} /> Navigator
          </button>

          <button
            onClick={() => { setAnswers({}); setShowAnswers(false); setCurrentIndex(0); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-all"
            title="Ulangi dari awal"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={submitSession}
            disabled={view === "submitting"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <Send size={14} />
            {view === "submitting" ? "Menyimpan..." : "Selesai & Review"}
          </button>
        </div>
        {submitError && (
          <div className="mt-2 text-sm text-red-500 font-medium text-right pr-1">
            ⚠ {submitError}
          </div>
        )}
      </div>

      <div className={`grid gap-5 ${showNav ? "lg:grid-cols-[1fr_220px]" : "grid-cols-1"}`}>
        {/* ── Question Card ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3 bg-slate-50 border-b flex items-center gap-3">
            <span className="text-slate-400 text-sm font-medium">
              Soal {currentIndex + 1} dari {total}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
              {meta.code}
            </span>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>

          {/* Question text */}
          <div className="px-6 pt-6 pb-4">
            <div
              className="text-slate-800 font-medium leading-relaxed text-base prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: q.text }}
            />
          </div>

          {/* Options */}
          <div className="px-6 pb-6 space-y-2.5">
            {q.options.map((opt) => {
              let cls =
                "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer";
              let icon: React.ReactNode = null;

              if (showAnswers) {
                if (opt.key === q.correctAnswer) {
                  cls = "border-emerald-500 bg-emerald-50 cursor-default";
                  icon = <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
                } else if (opt.key === userAns && !isCorrect) {
                  cls = "border-red-400 bg-red-50 cursor-default opacity-80";
                  icon = <XCircle size={18} className="text-red-500 shrink-0" />;
                } else {
                  cls = "border-slate-200 bg-slate-50 opacity-50 cursor-default";
                }
              } else if (userAns === opt.key) {
                cls = "border-primary bg-primary/5 cursor-pointer";
              }

              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (showAnswers) return;
                    setAnswers((prev) => ({ ...prev, [q.id]: opt.key }));
                  }}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${cls}`}
                >
                  <span
                    className={`font-bold shrink-0 mt-0.5 ${
                      showAnswers && opt.key === q.correctAnswer
                        ? "text-emerald-700"
                        : showAnswers && opt.key === userAns && !isCorrect
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    {opt.key}.
                  </span>
                  <span className="flex-1 text-slate-700 q-html" dangerouslySetInnerHTML={{ __html: opt.text ?? "" }} />
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showAnswers && q.explanation && (
            <div className="mx-6 mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="font-bold text-blue-900 text-sm mb-1">Pembahasan</div>
              <div
                className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: q.explanation }}
              />
            </div>
          )}

          {/* Nav buttons */}
          <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>

            <span className="text-sm text-slate-500 font-medium">
              {currentIndex + 1} / {total}
            </span>

            <button
              disabled={currentIndex === total - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Berikutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Navigator Sidebar ── */}
        {showNav && (
          <div className="bg-white rounded-2xl border shadow-sm p-4 h-fit sticky top-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Navigator Soal
            </div>

            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((qs, idx) => {
                const ans = answers[qs.id];
                let btnCls = "text-slate-400 bg-slate-100 hover:bg-slate-200";

                if (showAnswers && ans) {
                  btnCls =
                    ans === qs.correctAnswer
                      ? "bg-emerald-500 text-white"
                      : "bg-red-400 text-white";
                } else if (showAnswers && !ans) {
                  btnCls = "bg-slate-200 text-slate-500";
                } else if (ans) {
                  btnCls = "bg-primary text-white";
                }

                return (
                  <button
                    key={qs.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${btnCls} ${
                      idx === currentIndex ? "ring-2 ring-offset-1 ring-primary" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="border-t pt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" />
                Belum dijawab
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                Sudah dijawab
              </div>
              {showAnswers && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500" />
                    Benar
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-400" />
                    Salah
                  </div>
                </>
              )}
            </div>

            {/* Score summary */}
            {showAnswers && answeredCount > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Skor Sementara
                </div>
                {(() => {
                  const correct = questions.filter(
                    (qs) => answers[qs.id] === qs.correctAnswer,
                  ).length;
                  const pct = Math.round((correct / answeredCount) * 100);
                  return (
                    <div>
                      <div className="text-2xl font-black text-slate-800 mb-1">
                        {correct}
                        <span className="text-sm font-medium text-slate-400">
                          /{answeredCount}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          pct >= 70 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {pct}% benar
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 70 ? "bg-emerald-500" : "bg-red-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
