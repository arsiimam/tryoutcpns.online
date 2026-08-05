import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { CheckCircle2, XCircle, Heart, ChevronLeft } from "lucide-react";

interface ReviewQuestion {
  id: string;
  text: string;
  categoryId: string;
  options: { key: string; text: string }[];
  correctAnswer: string | null;
  explanation: string;
  userAnswer: string | null;
  isCorrect: boolean;
  isFavorite?: boolean;
}

interface BundleInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface SessionInfo {
  id: string;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
}

export function ReviewBundleDetailPage() {
  const params = useParams<{ bundleId: string }>();
  const [, navigate] = useLocation();
  const bundleId = params.bundleId;

  const [bundle, setBundle] = useState<BundleInfo | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"semua" | "salah" | "benar" | "favorit">("semua");
  const [openExplanation, setOpenExplanation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`/api/participant/practice/history/${bundleId}`, {
          credentials: "include",
        });
        if (!r.ok) {
          const d = await r.json();
          setError(d.error ?? "Gagal memuat data review.");
          return;
        }
        const data = await r.json();
        setBundle(data.bundle);
        setSession(data.session);
        setQuestions((data.questions ?? []).map((q: any) => ({ ...q, isFavorite: false })));
      } catch {
        setError("Terjadi kesalahan saat memuat data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bundleId]);

  const toggleFav = (qId: string) =>
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, isFavorite: !q.isFavorite } : q));

  const toggleExplanation = (qId: string) =>
    setOpenExplanation(prev => ({ ...prev, [qId]: !prev[qId] }));

  let filtered = questions;
  if (tab === "salah")   filtered = questions.filter(q => q.userAnswer !== null && !q.isCorrect);
  if (tab === "benar")   filtered = questions.filter(q => q.isCorrect);
  if (tab === "favorit") filtered = questions.filter(q => q.isFavorite);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !bundle || !session) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border text-center">
          <p className="text-slate-500 font-medium">{error ?? "Data tidak ditemukan."}</p>
          <button
            onClick={() => navigate("/review")}
            className="mt-4 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Kembali ke Daftar Review
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const pct = session.totalQuestions > 0
    ? Math.round((session.correctCount / session.totalQuestions) * 100)
    : 0;

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "semua",   label: `Semua (${questions.length})` },
    { key: "salah",   label: `Salah (${questions.filter(q => q.userAnswer !== null && !q.isCorrect).length})` },
    { key: "benar",   label: `Benar (${questions.filter(q => q.isCorrect).length})` },
    { key: "favorit", label: `Favorit (${questions.filter(q => q.isFavorite).length})` },
  ];

  return (
    <DashboardLayout>
      {/* Back button */}
      <button
        onClick={() => navigate("/review")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Kembali ke Daftar Review
      </button>

      {/* Header + summary */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {bundle.category}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">{bundle.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Dikerjakan: {new Date(session.completedAt).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <div className={`text-3xl font-black ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}>
                {pct}%
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {session.correctCount} benar dari {session.totalQuestions} soal
              </div>
            </div>
            <div className="w-16 h-16 relative flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 px-4 font-medium text-sm whitespace-nowrap transition-colors relative ${tab === t.key ? "text-primary" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      {/* Question list */}
      <div className="space-y-6">
        {filtered.map((q, idx) => {
          const isWrong = q.userAnswer !== null && !q.isCorrect;
          const isExpOpen = openExplanation[q.id];

          return (
            <div key={q.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full tracking-wider uppercase">
                    {q.categoryId || "Materi"}
                  </span>
                  {q.isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 size={13} /> Benar
                    </span>
                  ) : q.userAnswer !== null ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                      <XCircle size={13} /> Salah
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Tidak dijawab</span>
                  )}
                </div>
                <button
                  onClick={() => toggleFav(q.id)}
                  className={`p-2 rounded-full transition-colors ${q.isFavorite ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-slate-400 hover:bg-slate-200"}`}
                >
                  <Heart size={16} className={q.isFavorite ? "fill-current" : ""} />
                </button>
              </div>

              <div className="p-6">
                {/* Question text */}
                <div
                  className="text-slate-800 font-medium mb-6 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: q.text }}
                />

                {/* Options */}
                <div className="space-y-2.5 mb-5">
                  {q.options.map((opt) => {
                    let cls = "border-slate-200 bg-white opacity-50";
                    let icon = null;

                    if (opt.key === q.correctAnswer) {
                      cls = "border-emerald-500 bg-emerald-50 text-emerald-900";
                      icon = <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
                    } else if (opt.key === q.userAnswer && isWrong) {
                      cls = "border-red-400 bg-red-50 text-red-900";
                      icon = <XCircle size={18} className="text-red-500 shrink-0" />;
                    }

                    return (
                      <div
                        key={opt.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 ${cls}`}
                      >
                        <span className="font-bold mt-0.5 shrink-0">{opt.key}.</span>
                        <span className="flex-1">{opt.text}</span>
                        {icon}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation toggle */}
                <button
                  onClick={() => toggleExplanation(q.id)}
                  className="text-sm font-semibold text-primary hover:underline focus:outline-none"
                >
                  {isExpOpen ? "Sembunyikan Pembahasan" : "Lihat Pembahasan"}
                </button>

                {isExpOpen && q.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm leading-relaxed">
                    <div className="font-bold text-blue-900 mb-1">Pembahasan:</div>
                    <div
                      className="text-slate-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: q.explanation }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-slate-500">Tidak ada soal dalam kategori ini.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
