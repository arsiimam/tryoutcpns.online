// @refresh reset
import React, { useEffect, useState } from "react";
import { KatexRenderer } from "../../components/KatexRenderer";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import {
  getExplanationImages,
  getQuestionImages,
  resolveStorageUrl,
} from "../../lib/storage-url";
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
  Lock,
  Crown,
} from "lucide-react";
import { useLocation } from "wouter";

/* ── Types ────────────────────────────────── */
interface BundleInfo {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  category: string;
  questionCount: number;
  sortOrder: number;
  isPremium: boolean;
}

interface PracticeQuestion {
  id: string;
  text: string;
  options: { key: string; text: string; imageUrl?: string }[];
  correctAnswer: string | null;
  explanation: string;
  metadata?: unknown;
  difficulty: "mudah" | "sedang" | "sulit";
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
type View = "groups" | "bundles" | "loading" | "session" | "submitting";

export function PracticePage() {
  const [allBundles, setAllBundles] = useState<BundleInfo[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(true);

  const [view, setView]                       = useState<View>("groups");
  const [selectedGroup, setSelectedGroup]     = useState<BundleInfo | null>(null);
  const [selectedBundle, setSelectedBundle]   = useState<BundleInfo | null>(null);
  const [questions, setQuestions]             = useState<PracticeQuestion[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers]   = useState(false);
  const [showNav, setShowNav]           = useState(true);
  const [submitError, setSubmitError]   = useState<string | null>(null);

  /* ── Fetch bundles on mount ── */
  useEffect(() => {
    fetch("/api/participant/practice/bundles", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllBundles(d.bundles?.map((b: any) => ({ ...b, id: String(b.id), parentId: b.parentId ? String(b.parentId) : null })) ?? []))
      .catch(() => {})
      .finally(() => setLoadingBundles(false));
  }, []);

  /* ── Browser back-button support ── */
  useEffect(() => {
    // Mark current history entry so we can detect a "back" into this page
    history.replaceState({ practiceView: "groups" }, "");

    const onPop = (_e: PopStateEvent) => {
      setView(prev => {
        if (prev === "session" || prev === "submitting") {
          // Back from session → restore bundle list
          setSelectedBundle(null);
          setQuestions([]);
          // Push a new entry so subsequent back still works
          history.pushState({ practiceView: "bundles" }, "");
          return "bundles";
        }
        if (prev === "bundles") {
          // Back from bundle list → restore group list
          setSelectedGroup(null);
          history.pushState({ practiceView: "groups" }, "");
          return "groups";
        }
        return prev;
      });
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ── Compute roots and children ── */
  const childIds = new Set(allBundles.filter(b => b.parentId).map(b => b.id));

  // Groups = root bundles that have children
  const groupBundles = allBundles.filter(b => !b.parentId && childIds.has(b.id) === false
    ? false // will be handled below
    : !b.parentId
  );
  // Actually: roots = bundles with no parentId
  const roots = allBundles.filter(b => !b.parentId);
  // A root is a "group" (folder) if it has children, otherwise it's a leaf
  const hasChildren = (id: string) => allBundles.some(b => b.parentId === id);
  const getChildren = (id: string) => allBundles.filter(b => b.parentId === id);

  /* ── Start practice for a leaf bundle ── */
  const [premiumError, setPremiumError] = useState<string | null>(null);

  const startBundle = async (bundle: BundleInfo) => {
    if (bundle.isPremium) {
      // Optimistic: try fetch, handle 403 server-side
    }
    setPremiumError(null);
    setView("loading");
    setSelectedBundle(bundle);
    try {
      const r = await fetch(`/api/participant/practice/bundles/${bundle.id}/questions`, {
        credentials: "include",
      });
      if (r.status === 403) {
        const d = await r.json();
        if (d.error === "premium_required") {
          setPremiumError(d.message ?? "Konten ini hanya untuk pengguna Premium.");
          setView("bundles");
          setSelectedBundle(null);
          return;
        }
      }
      const d = await r.json();
      setQuestions(d.questions ?? []);
      setCurrentIndex(0);
      setAnswers({});
      setShowAnswers(false);
      setView("session");
      history.pushState({ practiceView: "session", bundleId: bundle.id }, "");
    } catch {
      setView("bundles");
    }
  };

  const [, navigate] = useLocation();

  const openGroup = (group: BundleInfo) => {
    // If it has children → show children
    if (hasChildren(group.id)) {
      setSelectedGroup(group);
      setView("bundles");
      history.pushState({ practiceView: "bundles", groupId: group.id }, "");
    } else {
      // It's a leaf root → start directly
      startBundle(group);
    }
  };

  const exitSession = () => {
    setSelectedBundle(null);
    setQuestions([]);
    if (selectedGroup) setView("bundles");
    else setView("groups");
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
     GROUPS VIEW (root bundles)
  ════════════════════════════════════════════ */
  if (view === "groups") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Latihan Soal</h1>
          <p className="text-slate-500 mt-1">Pilih kategori soal yang ingin kamu latih.</p>
        </div>

        {loadingBundles ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-semibold text-slate-700 text-lg">Belum ada bundle soal tersedia</p>
            <p className="text-slate-400 text-sm mt-1">Admin belum mempublikasikan bundle latihan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roots.map((root) => {
              const children = getChildren(root.id);
              const isFolder = children.length > 0;
              const totalSoal = isFolder
                ? children.reduce((s, b) => s + (b.questionCount ?? 0), 0)
                : root.questionCount;
              const label = root.category || root.name.substring(0, 5).toUpperCase();
              return (
                <button
                  key={root.id}
                  onClick={() => openGroup(root)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-primary/40 hover:shadow-md p-6 text-left transition-all group"
                >
                  {/* Badge */}
                  <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-black text-sm text-slate-700 mb-4 group-hover:bg-primary/5 group-hover:border-primary/30 transition-colors">
                    {label.substring(0, 5)}
                  </div>
                  <h2 className="font-bold text-slate-800 text-base leading-snug mb-1">
                    {root.name}
                  </h2>
                  {root.description && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{root.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-3">
                    {isFolder && (
                      <span className="font-semibold text-slate-500">{children.length} paket</span>
                    )}
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {totalSoal} soal
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DashboardLayout>
    );
  }

  /* ════════════════════════════════════════════
     BUNDLE LIST VIEW (children of selected group)
  ════════════════════════════════════════════ */
  if (view === "bundles" || view === "loading") {
    const group     = selectedGroup;
    const groupName = group?.name ?? "Latihan Soal";
    const catLabel  = group?.category || group?.name?.substring(0, 5).toUpperCase() || "—";
    const children  = group ? getChildren(group.id) : [];
    return (
      <DashboardLayout>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={() => { setView("groups"); setSelectedGroup(null); }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} /> Latihan Soal
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-700">{groupName}</span>
        </div>

        {/* Group header */}
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex items-center gap-4 mb-6">
          <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center font-black text-sm text-slate-700 shrink-0">
            {catLabel.substring(0, 5)}
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800">{groupName}</h1>
            {group?.description && <p className="text-sm text-slate-500">{group.description}</p>}
          </div>
        </div>

        {/* Premium error toast */}
        {premiumError && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Lock size={16} className="text-amber-500 shrink-0" />
            <span className="flex-1">{premiumError}</span>
            <a href="/langganan" className="font-semibold underline whitespace-nowrap">Langganan Premium →</a>
            <button onClick={() => setPremiumError(null)} className="text-amber-500 hover:text-amber-700"><X size={14} /></button>
          </div>
        )}

        {/* Bundle list */}
        <div className="space-y-3">
          {children.map((b) => (
            <button
              key={b.id}
              onClick={() => startBundle(b)}
              disabled={view === "loading"}
              className={`w-full bg-white rounded-xl border transition-all px-5 py-4 text-left group disabled:opacity-60 disabled:cursor-wait flex items-center gap-4
                ${b.isPremium
                  ? "border-amber-200 hover:border-amber-400 hover:shadow-sm"
                  : "border-slate-200 hover:border-primary/40 hover:shadow-sm"}`}
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors
                ${b.isPremium
                  ? "border-amber-200 bg-amber-50 group-hover:bg-amber-100"
                  : "border-slate-200 bg-slate-50 group-hover:bg-primary/5 group-hover:border-primary/20"}`}>
                {b.isPremium
                  ? <Crown size={16} className="text-amber-500" />
                  : <BookOpen size={16} className="text-slate-500 group-hover:text-primary transition-colors" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm leading-snug">{b.name}</span>
                  {b.isPremium && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-wide">Premium</span>
                  )}
                </div>
                {b.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{b.description}</div>}
              </div>
              <div className="text-xs text-slate-400 shrink-0 flex items-center gap-1.5">
                {b.isPremium && <Lock size={12} className="text-amber-400" />}
                {b.questionCount ?? "?"} soal
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-primary/60 shrink-0 transition-colors" />
            </button>
          ))}
          {children.length === 0 && !loadingBundles && (
            <div className="text-center py-10 text-slate-400 text-sm">Belum ada soal tersedia.</div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ════════════════════════════════════════════
     SESSION VIEW
  ════════════════════════════════════════════ */

  function getCatMeta(category: string | null | undefined) {
    const cat = (category ?? "").toUpperCase();
    if (cat.includes("TWK")) return { code: "TWK", color: "text-blue-700",   bgColor: "bg-blue-50",   borderColor: "border-blue-200", badgeClass: "bg-blue-100 text-blue-700" };
    if (cat.includes("TIU")) return { code: "TIU", color: "text-violet-700", bgColor: "bg-violet-50", borderColor: "border-violet-200", badgeClass: "bg-violet-100 text-violet-700" };
    if (cat.includes("TKP")) return { code: "TKP", color: "text-emerald-700",bgColor: "bg-emerald-50",borderColor: "border-emerald-200", badgeClass: "bg-emerald-100 text-emerald-700" };
    if (cat.includes("SKB")) return { code: "SKB", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200", badgeClass: "bg-orange-100 text-orange-700" };
    return { code: cat || "SOAL", color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200", badgeClass: "bg-slate-100 text-slate-700" };
  }

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
            <KatexRenderer
              content={q.text}
              className="text-slate-800 font-medium leading-relaxed text-base prose prose-sm max-w-none"
            />
            {getQuestionImages(q.metadata).map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={resolveStorageUrl(image)}
                alt={`Gambar soal ${index + 1}`}
                className="mt-3 max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                loading="lazy"
              />
            ))}
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
                  <KatexRenderer content={opt.text ?? ""} block={false} className="flex-1 text-slate-700" />
                  {opt.imageUrl && (
                    <img
                      src={resolveStorageUrl(opt.imageUrl)}
                      alt={`Gambar opsi ${opt.key}`}
                      className="mt-1 max-h-24 max-w-[12rem] rounded border border-slate-200 object-contain"
                      loading="lazy"
                    />
                  )}
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showAnswers && q.explanation && (
            <div className="mx-6 mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="font-bold text-blue-900 text-sm mb-1">Pembahasan</div>
              <KatexRenderer
                content={q.explanation}
                className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
              />
              {getExplanationImages(q.metadata).map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={resolveStorageUrl(image)}
                  alt={`Gambar pembahasan ${index + 1}`}
                  className="mt-3 max-h-80 max-w-full rounded-lg border border-blue-100 object-contain"
                  loading="lazy"
                />
              ))}
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
