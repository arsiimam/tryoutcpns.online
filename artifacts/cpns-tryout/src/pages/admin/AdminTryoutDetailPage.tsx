import React, { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { KatexRenderer } from "../../components/KatexRenderer";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import {
  ArrowLeft, Download, ChevronDown, FileText, BookOpen,
  AlertCircle, Clock, BarChart2, Eye, Trash2, Copy, Plus, Pencil, X, Layers,
} from "lucide-react";

/* ── types ──────────────────────────────────────────────── */
interface Question {
  id: number; sectionId: number; orderNum: number; type: string;
  content: string; options: { key: string; text: string }[] | null;
  correctAnswer: string | null; explanation: string | null;
  metadata: Record<string, any> | null; scoreWeight: number;
}
interface Section {
  id: number; name: string; category: string | null; orderNum: number;
  questionCount: number; timeLimitMinutes: number | null; passingScore: number | null;
  questions: Question[];
}
interface Bundle {
  id: number; name: string; description: string | null; category: string | null;
  durationMinutes: number; passingGrade: number; status: string;
  totalQuestions: number; settings: any;
  createdAt: string; updatedAt: string;
  sections: Section[];
}

const API = "/api/admin/tryouts";
const DIFF_CLS: Record<string, string> = {
  mudah:  "bg-emerald-100 text-emerald-700",
  sedang: "bg-amber-100  text-amber-700",
  sulit:  "bg-red-100    text-red-700",
};
const STATUS_CLS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft:     "bg-amber-100  text-amber-700",
};

function strip(html: string) { return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); }

/* ═══════════════════════════════════════════════════════ */
export function AdminTryoutDetailPage() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const id = Number(tryoutId);

  const [bundle,  setBundle]  = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState("info");   // "info" | section id string
  const [previewQ, setPreviewQ] = useState<Question | null>(null);

  // section modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [secName,     setSecName]     = useState("");
  const [secCategory, setSecCategory] = useState("");
  const [secPassing,  setSecPassing]  = useState("");
  const [secTime,     setSecTime]     = useState("");
  const [secSaving,   setSecSaving]   = useState(false);
  const [secError,    setSecError]    = useState("");

  /* ── load ───────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/${id}`, { credentials: "include" });
        if (!r.ok) { setError("Bundle tidak ditemukan."); return; }
        const data = await r.json();
        setBundle(data);
        if (data.sections?.length) setTab(String(data.sections[0].id));
      } catch { setError("Gagal memuat data."); }
      finally { setLoading(false); }
    })();
  }, [id]);

  /* ── delete question ────────────────────────────────── */
  const delQ = async (q: Question) => {
    if (!bundle || !confirm(`Hapus soal #${q.orderNum}?`)) return;
    const sectionId = q.sectionId;
    const r = await fetch(`${API}/${id}/questions/${q.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setBundle(prev => prev ? {
        ...prev,
        totalQuestions: prev.totalQuestions - 1,
        sections: prev.sections.map(s => s.id === sectionId
          ? { ...s, questionCount: s.questionCount - 1, questions: s.questions.filter(x => x.id !== q.id) }
          : s),
      } : prev);
    }
  };

  /* ── add section ────────────────────────────────────── */
  const openSectionModal = () => {
    setSecName(""); setSecCategory(""); setSecPassing(""); setSecTime(""); setSecError("");
    setShowSectionModal(true);
  };
  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName.trim()) { setSecError("Nama seksi wajib diisi."); return; }
    setSecSaving(true); setSecError("");
    try {
      const r = await fetch(`${API}/${id}/sections`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: secName, category: secCategory || null,
          passingScore: secPassing ? Number(secPassing) : null,
          timeLimitMinutes: secTime ? Number(secTime) : null,
        }),
      });
      if (!r.ok) { const d = await r.json(); setSecError(d.error ?? "Gagal menyimpan."); return; }
      const newSec: Section = await r.json();
      setBundle(prev => prev ? { ...prev, sections: [...prev.sections, newSec] } : prev);
      setTab(String(newSec.id));
      setShowSectionModal(false);
    } catch { setSecError("Terjadi kesalahan."); }
    finally { setSecSaving(false); }
  };

  /* ── delete section ──────────────────────────────────── */
  const delSection = async (sec: Section) => {
    if (!confirm(`Hapus seksi "${sec.name}" beserta ${sec.questionCount} soal di dalamnya?`)) return;
    const r = await fetch(`${API}/${id}/sections/${sec.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setBundle(prev => {
        if (!prev) return prev;
        const sections = prev.sections.filter(s => s.id !== sec.id);
        return { ...prev, sections, totalQuestions: prev.totalQuestions - sec.questionCount };
      });
      setTab(prev => prev === String(sec.id) ? (bundle?.sections.find(s => s.id !== sec.id) ? String(bundle.sections.find(s => s.id !== sec.id)!.id) : "info") : prev);
    }
  };

  /* ── export ─────────────────────────────────────────── */
  const exportB = (fmt: "json" | "html") => window.location.assign(`${API}/${id}/export?format=${fmt}`);

  /* ── render guards ──────────────────────────────────── */
  if (loading) return <AdminLayout><div className="p-12 text-center text-slate-400">Memuat...</div></AdminLayout>;
  if (error || !bundle) return (
    <AdminLayout>
      <div className="p-12 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-600 font-medium">{error || "Bundle tidak ditemukan."}</p>
        <Link href="/admin/tryouts"><button className="mt-4 px-4 py-2 border rounded-lg text-sm">← Kembali</button></Link>
      </div>
    </AdminLayout>
  );

  const activeSection = bundle.sections.find(s => String(s.id) === tab);

  return (
    <AdminLayout>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <Link href="/admin/tryouts">
            <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors">
              <ArrowLeft size={15} /> Manajemen Tryout
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{bundle.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {bundle.category && (
              <span className="px-2 py-0.5 bg-[#dce8f5] text-[#0A1C3C] text-xs font-bold rounded uppercase">{bundle.category}</span>
            )}
            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${STATUS_CLS[bundle.status] ?? "bg-slate-100 text-slate-600"}`}>
              {bundle.status}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={12} /> {bundle.durationMinutes} menit
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <BarChart2 size={12} /> Passing: {bundle.passingGrade}
            </span>
            <span className="text-xs text-slate-400">{bundle.totalQuestions} soal total</span>
          </div>
          {bundle.description && <p className="text-sm text-slate-500 mt-2 max-w-2xl">{bundle.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openSectionModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "#1E4D9C" }}>
            <Layers size={14} /> Tambah Seksi
          </button>
          <ExportDropdown onExport={exportB} />
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b flex-wrap">
        <TabBtn active={tab === "info"} onClick={() => setTab("info")}>Informasi</TabBtn>
        {bundle.sections.map(s => (
          <div key={s.id} className="relative flex items-center group">
            <TabBtn active={tab === String(s.id)} onClick={() => setTab(String(s.id))}>
              {s.name}
              <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full font-normal">
                {s.questionCount}
              </span>
            </TabBtn>
            <button
              onClick={() => delSection(s)}
              title="Hapus seksi"
              className="hidden group-hover:flex absolute -top-1 -right-1 w-4 h-4 items-center justify-center rounded-full bg-red-500 text-white z-10">
              <X size={9} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Info Tab ────────────────────────────────────── */}
      {tab === "info" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Informasi Tryout</h3>
            <dl className="space-y-3 text-sm">
              {[
                { label: "Nama",           val: bundle.name },
                { label: "Kategori",       val: bundle.category ?? "—" },
                { label: "Status",         val: bundle.status },
                { label: "Durasi",         val: `${bundle.durationMinutes} menit` },
                { label: "Passing Grade",  val: bundle.passingGrade.toString() },
                { label: "Total Soal",     val: bundle.totalQuestions.toString() },
                { label: "Dibuat",         val: new Date(bundle.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" }) },
                { label: "Diperbarui",     val: new Date(bundle.updatedAt).toLocaleDateString("id-ID", { dateStyle: "long" }) },
              ].map(item => (
                <div key={item.label} className="flex justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">{item.label}</dt>
                  <dd className="font-medium text-slate-800 text-right">{item.val}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Komposisi Soal</h3>
            {bundle.sections.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400 mb-4">Belum ada seksi / soal.</p>
                <button onClick={openSectionModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: "#1E4D9C" }}>
                  <Plus size={14} /> Tambah Seksi Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bundle.sections.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-12 text-xs font-bold text-[#0A1C3C] bg-[#dce8f5] px-2 py-0.5 rounded text-center">
                      {s.category ?? s.name}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: bundle.totalQuestions > 0
                            ? `${(s.questionCount / bundle.totalQuestions) * 100}%` : "0%",
                          background: "#1E4D9C",
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-8 text-right">{s.questionCount}</span>
                    {s.passingScore != null && (
                      <span className="text-xs text-slate-400">min {s.passingScore}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {bundle.settings && (
              <div className="mt-6">
                <h3 className="font-semibold text-slate-800 mb-3">Pengaturan</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Acak Soal",    val: bundle.settings.randomize_questions },
                    { label: "Acak Pilihan", val: bundle.settings.randomize_options },
                    { label: "Hasil Langsung", val: bundle.settings.show_result_immediately },
                    { label: "Navigasi Mundur", val: bundle.settings.allow_back_navigation },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between">
                      <span className="text-slate-500">{s.label}</span>
                      <span className={`font-medium ${s.val ? "text-emerald-600" : "text-slate-400"}`}>
                        {s.val == null ? "—" : s.val ? "Ya" : "Tidak"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section Question Tab ─────────────────────────── */}
      {tab !== "info" && activeSection && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-[#dce8f5] text-[#0A1C3C] text-xs font-bold rounded uppercase">
                {activeSection.category ?? activeSection.name}
              </span>
              <span className="text-sm text-slate-500">{activeSection.questionCount} soal</span>
              {activeSection.passingScore != null && (
                <span className="text-xs text-slate-400">Passing score: {activeSection.passingScore}</span>
              )}
            </div>
            <Link href={`/admin/tryouts/${id}/sections/${activeSection.id}/add`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: "#1E4D9C" }}>
                <Plus size={13} /> Tambah Soal
              </button>
            </Link>
          </div>

          {activeSection.questions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-medium">Belum ada soal di seksi ini.</p>
              <Link href={`/admin/tryouts/${id}/sections/${activeSection.id}/add`}>
                <button className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white mx-auto"
                  style={{ background: "#1E4D9C" }}>
                  <Plus size={15} /> Tambah Soal Pertama
                </button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">Cuplikan Soal</th>
                  <th className="px-4 py-3 w-20 text-center">Jawaban</th>
                  <th className="px-4 py-3 w-24">Kesulitan</th>
                  <th className="px-4 py-3 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSection.questions.map(q => {
                  const diff = q.metadata?.tingkat_kesulitan ?? q.metadata?.difficulty ?? null;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{q.orderNum}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="line-clamp-2 text-slate-700 text-xs leading-relaxed">{strip(q.content)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {q.correctAnswer
                          ? <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center justify-center">{q.correctAnswer}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {diff
                          ? <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${DIFF_CLS[diff] ?? "bg-slate-100 text-slate-600"}`}>{diff}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setPreviewQ(q)} title="Lihat Detail"
                          className="p-1.5 rounded hover:bg-[#dce8f5] text-[#1E4D9C] mr-1"><Eye size={14} /></button>
                        <Link href={`/admin/tryouts/${id}/questions/${q.id}/edit`}>
                          <button title="Edit Soal" className="p-1.5 rounded hover:bg-amber-50 text-amber-500 mr-1">
                            <Pencil size={14} />
                          </button>
                        </Link>
                        <button onClick={() => delQ(q)} title="Hapus"
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Add Section Modal ───────────────────────────── */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-base text-slate-900">Tambah Seksi Baru</h2>
              <button onClick={() => setShowSectionModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><X size={16} /></button>
            </div>
            <form onSubmit={saveSection} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Seksi <span className="text-red-500">*</span></label>
                <input value={secName} onChange={e => setSecName(e.target.value)} required
                  placeholder="cth: TWK, TIU, TKP"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input value={secCategory} onChange={e => setSecCategory(e.target.value)}
                  placeholder="cth: SKD, SKB"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Passing Score <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <input type="number" min={0} value={secPassing} onChange={e => setSecPassing(e.target.value)}
                    placeholder="cth: 65"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Waktu (menit) <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <input type="number" min={1} value={secTime} onChange={e => setSecTime(e.target.value)}
                    placeholder="cth: 30"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              {secError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{secError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowSectionModal(false)}
                  className="flex-1 h-10 rounded-lg border text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={secSaving}
                  className="flex-1 h-10 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "#1E4D9C" }}>
                  {secSaving ? "Menyimpan..." : "Simpan Seksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Question Preview Modal ───────────────────────── */}
      {previewQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-base">
                Soal #{previewQ.orderNum}
                <span className="ml-2 text-xs text-slate-400 font-normal">
                  {bundle.sections.find(s => s.id === previewQ.sectionId)?.name}
                </span>
              </h2>
              <button onClick={() => setPreviewQ(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Soal</p>
                <KatexRenderer content={previewQ.content} className="prose prose-sm max-w-none text-slate-800" />
              </div>
              {Array.isArray(previewQ.options) && previewQ.options.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Pilihan</p>
                  <div className="space-y-2">
                    {previewQ.options.map(o => (
                      <div key={o.key} className={`flex gap-3 p-3 rounded-lg border text-sm ${
                        o.key === previewQ.correctAnswer ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
                      }`}>
                        <span className={`font-bold w-5 shrink-0 ${o.key === previewQ.correctAnswer ? "text-emerald-600" : "text-slate-400"}`}>{o.key}</span>
                        <KatexRenderer content={o.text} block={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {previewQ.explanation && (
                <div className="bg-[#dce8f5] rounded-lg p-4">
                  <p className="text-xs font-semibold text-[#1E4D9C] uppercase mb-2">Pembahasan</p>
                  <KatexRenderer content={previewQ.explanation} className="prose prose-sm max-w-none text-slate-700" />
                </div>
              )}
              {previewQ.metadata && Object.keys(previewQ.metadata).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Metadata</p>
                  <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(previewQ.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active
          ? "border-[#1E4D9C] text-[#0A1C3C]"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}>
      {children}
    </button>
  );
}

function ExportDropdown({ onExport }: { onExport: (fmt: "json" | "html") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
        <Download size={15} /> Export <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white border rounded-lg shadow-lg z-20 py-1 text-sm">
            <button onClick={() => { onExport("json"); setOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
              <FileText size={14} /> Export JSON
            </button>
            <button onClick={() => { onExport("html"); setOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
              <BookOpen size={14} /> Export HTML
            </button>
          </div>
        </>
      )}
    </div>
  );
}
