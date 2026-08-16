import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { KatexRenderer } from "../../components/KatexRenderer";
import { resolveStorageUrl } from "../../lib/storage-url";
import {
  CheckCircle2, XCircle, Heart, ChevronLeft,
  Clock, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react";

interface ReviewQuestion {
  id: string;
  text: string;
  categoryId: string;
  options: { key: string; text: string; imageUrl?: string }[];
  correctAnswer: string | null;
  explanation: string;
  metadata?: {
    gambar_soal?: string[];
    pembahasan?: { gambar_pembahasan?: string[] };
  };
  userAnswer: string | null;
  isCorrect: boolean;
  isFavorite?: boolean;
}

interface BundleInfo {
  id: string; name: string; category: string; description: string;
}

interface SessionInfo {
  id: string; correctCount: number; totalQuestions: number; completedAt: string;
}

interface SessionMeta {
  id: string; correctCount: number; totalQuestions: number; completedAt: string;
}

export function ReviewBundleDetailPage() {
  const params = useParams<{ bundleId: string }>();
  const [, navigate] = useLocation();
  const bundleId = params.bundleId;

  /* Session list (all sessions for this bundle) */
  const [sessions, setSessions]       = useState<SessionMeta[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  /* Questions for selected session */
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [bundle, setBundle]         = useState<BundleInfo | null>(null);
  const [session, setSession]       = useState<SessionInfo | null>(null);
  const [questions, setQuestions]   = useState<ReviewQuestion[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [tab, setTab] = useState<"semua" | "salah" | "benar" | "favorit">("semua");
  const [openExplanation, setOpenExplanation] = useState<Record<string, boolean>>({});

  /* 1. Load session list on mount */
  useEffect(() => {
    fetch(`/api/participant/practice/history/${bundleId}/sessions`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const list: SessionMeta[] = d.sessions ?? [];
        setSessions(list);
        if (list.length > 0) setSelectedSessionId(list[0].id); // default to latest
      })
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [bundleId]);

  /* 2. Load questions whenever selectedSessionId changes */
  useEffect(() => {
    if (!selectedSessionId) return;
    setLoading(true);
    setError(null);
    setQuestions([]);
    setBundle(null);
    setSession(null);
    setTab("semua");
    setOpenExplanation({});

    const url = `/api/participant/practice/history/${bundleId}?sessionId=${selectedSessionId}`;
    fetch(url, { credentials: "include" })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error ?? "Gagal memuat.")))
      .then(data => {
        setBundle(data.bundle);
        setSession(data.session);
        setQuestions((data.questions ?? []).map((q: any) => ({ ...q, isFavorite: false })));
      })
      .catch(e => setError(typeof e === "string" ? e : "Terjadi kesalahan."))
      .finally(() => setLoading(false));
  }, [bundleId, selectedSessionId]);

  const toggleFav = (qId: string) =>
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, isFavorite: !q.isFavorite } : q));
  const toggleExplanation = (qId: string) =>
    setOpenExplanation(prev => ({ ...prev, [qId]: !prev[qId] }));

  let filtered = questions;
  if (tab === "salah")   filtered = questions.filter(q => q.userAnswer !== null && !q.isCorrect);
  if (tab === "benar")   filtered = questions.filter(q => q.isCorrect);
  if (tab === "favorit") filtered = questions.filter(q => q.isFavorite);

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  /* Loading session list */
  if (sessionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (sessions.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-slate-500">Belum ada sesi latihan untuk bundle ini.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Back */}
      <button
        onClick={() => navigate("/review")}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
      >
        <ChevronLeft size={16} /> Kembali ke Daftar
      </button>

      {/* Bundle header */}
      {bundle && (
        <div className="mb-5 bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">{bundle.category}</span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">{bundle.name}</h1>
              {bundle.description && <p className="text-sm text-slate-500 mt-1">{bundle.description}</p>}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
              <BarChart2 size={15} />
              <span className="font-semibold text-slate-700">{sessions.length}</span> sesi
            </div>
          </div>
        </div>
      )}

      {/* ── Session picker ── */}
      {sessions.length > 1 && (
        <div className="mb-5 bg-white rounded-xl border shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock size={13} /> Riwayat Sesi
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {sessions.map((s, idx) => {
              const pct = s.totalQuestions > 0 ? Math.round((s.correctCount / s.totalQuestions) * 100) : 0;
              const isSelected = s.id === selectedSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={isSelected ? { background: "#1E4D9C", color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>
                    {sessions.length - idx}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500">{fmtDate(s.completedAt)}</div>
                    <div className="mt-0.5 h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                      <div className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-bold ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}>
                    {s.correctCount}/{s.totalQuestions} <span className="text-xs font-normal text-slate-400">({pct}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Questions for selected session ── */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">{error}</div>
      ) : (
        <>
          {/* Session summary */}
          {session && (
            <div className="mb-4 flex items-center gap-4 bg-white rounded-xl border shadow-sm p-4">
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-0.5">Sesi yang ditampilkan</div>
                <div className="text-sm font-semibold text-slate-700">{fmtDate(session.completedAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900">
                  {session.correctCount}/{session.totalQuestions}
                </div>
                <div className="text-xs text-slate-400">jawaban benar</div>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {(["semua", "benar", "salah", "favorit"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors"
                style={tab === t
                  ? { background: "#1E4D9C", color: "#fff" }
                  : { background: "#f1f5f9", color: "#475569" }}>
                {t === "benar" ? `✓ Benar (${questions.filter(q=>q.isCorrect).length})`
                  : t === "salah" ? `✗ Salah (${questions.filter(q=>q.userAnswer!==null&&!q.isCorrect).length})`
                  : t === "favorit" ? `♥ Favorit (${questions.filter(q=>q.isFavorite).length})`
                  : `Semua (${questions.length})`}
              </button>
            ))}
          </div>

          {/* Question list */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-white rounded-xl border">Tidak ada soal di kategori ini.</div>
            ) : filtered.map((q, idx) => {
              const isOpen = !!openExplanation[q.id];
              return (
                <div key={q.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  q.isCorrect ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-red-400"}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-sm font-bold text-slate-400">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="prose prose-sm max-w-none text-slate-800"
                          dangerouslySetInnerHTML={{ __html: q.text }} />
                        {q.metadata?.gambar_soal?.map((image, imageIndex) => (
                          <img
                            key={`${image}-${imageIndex}`}
                            src={resolveStorageUrl(image)}
                            alt={`Gambar soal ${imageIndex + 1}`}
                            className="mt-3 max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                            loading="lazy"
                          />
                        ))}
                      </div>
                      <button onClick={() => toggleFav(q.id)}
                        className={`shrink-0 transition-colors ${q.isFavorite ? "text-red-500" : "text-slate-300 hover:text-red-400"}`}>
                        <Heart size={18} fill={q.isFavorite ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="space-y-1.5 mt-3">
                      {q.options.map(opt => {
                        const isUser    = q.userAnswer === opt.key;
                        const isCorrect = q.correctAnswer === opt.key;
                        let cls = "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors";
                        if (isCorrect) cls += " bg-emerald-50 border-emerald-200 font-semibold text-emerald-800";
                        else if (isUser && !isCorrect) cls += " bg-red-50 border-red-200 font-semibold text-red-700";
                        else cls += " bg-slate-50 border-slate-100 text-slate-700";
                        return (
                          <div key={opt.key} className={cls}>
                            <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-current">{opt.key}</span>
                            <span className="flex-1">
                              <KatexRenderer content={opt.text ?? ""} block={false} />
                              {opt.imageUrl && (
                                <img
                                  src={resolveStorageUrl(opt.imageUrl)}
                                  alt={`Gambar opsi ${opt.key}`}
                                  className="mt-1 max-h-24 max-w-[12rem] rounded border border-slate-200 object-contain"
                                  loading="lazy"
                                />
                              )}
                            </span>
                            {isCorrect && <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />}
                            {isUser && !isCorrect && <XCircle size={15} className="text-red-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <button onClick={() => toggleExplanation(q.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isOpen ? "Sembunyikan Pembahasan" : "Lihat Pembahasan"}
                      </button>
                    )}
                    {isOpen && q.explanation && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="prose prose-sm max-w-none text-blue-900 text-sm"
                          dangerouslySetInnerHTML={{ __html: q.explanation }} />
                        {q.metadata?.pembahasan?.gambar_pembahasan?.map((image, imageIndex) => (
                          <img
                            key={`${image}-${imageIndex}`}
                            src={resolveStorageUrl(image)}
                            alt={`Gambar pembahasan ${imageIndex + 1}`}
                            className="mt-3 max-h-80 max-w-full rounded-lg border border-blue-100 object-contain"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
