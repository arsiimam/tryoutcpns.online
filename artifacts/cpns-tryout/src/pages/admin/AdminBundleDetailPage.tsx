import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { KatexRenderer } from "../../components/KatexRenderer";
import {
  getExplanationImages,
  getQuestionImages,
  resolveStorageUrl,
} from "../../lib/storage-url";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import {
  ArrowLeft, Download, Trash2, Eye, ChevronDown, FileText, BookOpen,
  AlertCircle, BookMarked, Plus, Pencil,
} from "lucide-react";

/* ── types ─────────────────────────────────────────────── */
interface Bundle {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  status: "draft" | "published";
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: number;
  bundleId: number;
  orderNum: number;
  type: string;
  content: string;
  options: { key: string; text: string }[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

const API = "/api/admin/bundles";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

const DIFF_STYLE: Record<string, string> = {
  mudah:  "bg-emerald-100 text-emerald-700",
  sedang: "bg-amber-100  text-amber-700",
  sulit:  "bg-red-100    text-red-700",
};

/* ═══════════════════════════════════════════════════════ */
export function AdminBundleDetailPage() {
  const params = useParams<{ bundleId: string }>();
  const bundleId = Number(params.bundleId);

  const [bundle,    setBundle]    = useState<Bundle | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [previewQ,  setPreviewQ]  = useState<Question | null>(null);
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 50;

  /* ── load ─────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      const [br, qr] = await Promise.all([
        fetch(`${API}/${bundleId}`,             { credentials: "include" }),
        fetch(`${API}/${bundleId}/questions`,    { credentials: "include" }),
      ]);
      if (!br.ok) { setError("Bundle tidak ditemukan."); return; }
      setBundle(await br.json());
      setQuestions(qr.ok ? await qr.json() : []);
    } catch { setError("Gagal memuat data."); }
    finally  { setLoading(false); }
  };
  useEffect(() => { if (bundleId) load(); }, [bundleId]);

  /* ── delete question ──────────────────────────────────── */
  const deleteQ = async (q: Question) => {
    if (!confirm(`Hapus soal #${q.orderNum}?`)) return;
    const r = await fetch(`${API}/${bundleId}/questions/${q.id}`, {
      method: "DELETE", credentials: "include"
    });
    if (r.ok) {
      setQuestions(prev => prev.filter(x => x.id !== q.id));
      setBundle(prev => prev ? { ...prev, questionCount: prev.questionCount - 1 } : prev);
    }
  };

  /* ── filtered + paginated ─────────────────────────────── */
  const filtered = questions.filter(q =>
    stripHtml(q.content).toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── export ───────────────────────────────────────────── */
  const exportBundle = (fmt: "json" | "html") => {
    window.location.href = `${API}/${bundleId}/export?format=${fmt}`;
  };

  /* ── render ───────────────────────────────────────────── */
  if (loading) return (
    <AdminLayout>
      <div className="p-12 text-center text-slate-400">Memuat...</div>
    </AdminLayout>
  );
  if (error || !bundle) return (
    <AdminLayout>
      <div className="p-12 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-600 font-medium">{error || "Bundle tidak ditemukan."}</p>
        <Link href="/admin/questions">
          <button className="mt-4 px-4 py-2 border rounded-lg text-sm">← Kembali</button>
        </Link>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      {/* ── breadcrumb + header ─────────────────────────── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <Link href="/admin/questions">
            <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors">
              <ArrowLeft size={15} /> Bank Soal
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{bundle.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {bundle.category && (
              <span className="px-2 py-0.5 bg-[#dce8f5] text-[#0A1C3C] text-xs font-bold rounded uppercase">
                {bundle.category}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
              bundle.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {bundle.status}
            </span>
            <span className="text-xs text-slate-400">
              {bundle.questionCount.toLocaleString()} soal
            </span>
            <span className="text-xs text-slate-400">
              Diperbarui {new Date(bundle.updatedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
          {bundle.description && (
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">{bundle.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/admin/questions/${bundle.id}/add`}>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "#1E4D9C" }}>
              <Plus size={15} /> Tambah Soal
            </button>
          </Link>
          <ExportMenu onExport={exportBundle} />
        </div>
      </div>

      {/* ── search + info ───────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm mb-4 p-4 flex gap-3 items-center flex-wrap">
        <input
          type="text"
          placeholder="Cari cuplikan soal..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none"
        />
        <span className="text-sm text-slate-500">
          Menampilkan {filtered.length} dari {questions.length} soal
        </span>
      </div>

      {/* ── question table ───────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {questions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BookMarked size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada soal</p>
            <p className="text-sm mt-1">Klik "Tambah Soal" untuk membuat soal baru, atau import dari halaman Bank Soal.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">Tipe</th>
                  <th className="px-4 py-3">Cuplikan Soal</th>
                  <th className="px-4 py-3 w-20 text-center">Jawaban</th>
                  <th className="px-4 py-3 w-24">Kesulitan</th>
                  <th className="px-4 py-3 w-20 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map(q => {
                  const diff = (q.metadata as any)?.tingkat_kesulitan ?? (q.metadata as any)?.difficulty ?? null;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{q.orderNum}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">
                          {q.type === "pilihan_ganda" || q.type === "multiple_choice" ? "Pilgan"
                            : q.type === "pilihan_ganda_kompleks" ? "PGK"
                            : q.type === "benar_salah" || q.type === "true_false" ? "B/S"
                            : q.type === "isian_singkat" ? "Isian"
                            : q.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="line-clamp-2 text-slate-700 text-xs leading-relaxed">
                          {stripHtml(q.content)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {q.correctAnswer ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center justify-center min-w-[1.75rem]">
                            {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(",") : q.correctAnswer}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {diff ? (
                          <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${DIFF_STYLE[diff] ?? "bg-slate-100 text-slate-600"}`}>
                            {diff}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setPreviewQ(q)} title="Lihat Detail"
                          className="p-1.5 rounded hover:bg-[#dce8f5] text-[#1E4D9C] mr-1">
                          <Eye size={14} />
                        </button>
                        <Link href={`/admin/questions/${bundle.id}/edit/${q.id}`}>
                          <button title="Edit Soal"
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-500 mr-1">
                            <Pencil size={14} />
                          </button>
                        </Link>
                        <button onClick={() => deleteQ(q)} title="Hapus"
                          className="p-1.5 rounded hover:bg-red-50 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t p-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Halaman {page} dari {totalPages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">←</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40">→</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Question Preview Modal ───────────────────────── */}
      {previewQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-base">Soal #{previewQ.orderNum}</h2>
              <button onClick={() => setPreviewQ(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              {/* Content */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Soal</p>
                <KatexRenderer content={previewQ.content} className="prose prose-sm max-w-none text-slate-800" />
                {getQuestionImages(previewQ.metadata).map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={resolveStorageUrl(image)}
                    alt={`Gambar soal ${index + 1}`}
                    className="mt-3 max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                  />
                ))}
              </div>

              {/* Options */}
              {Array.isArray(previewQ.options) && previewQ.options.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Pilihan</p>
                  <div className="space-y-2">
                    {previewQ.options.map((o: { key: string; text: string; imageUrl?: string }) => (
                      <div key={o.key}
                        className={`flex gap-3 p-3 rounded-lg border text-sm ${
                          o.key === previewQ.correctAnswer ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
                        }`}
                      >
                        <span className={`font-bold w-5 shrink-0 ${o.key === previewQ.correctAnswer ? "text-emerald-600" : "text-slate-400"}`}>
                          {o.key}
                        </span>
                        <div className="flex-1">
                          <KatexRenderer content={o.text} block={false} />
                          {o.imageUrl && (
                            <img
                              src={resolveStorageUrl(o.imageUrl)}
                              alt={`Gambar opsi ${o.key}`}
                              className="mt-1 max-h-24 max-w-[12rem] rounded border border-slate-200 object-contain"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              {previewQ.explanation && (
                <div className="bg-[#dce8f5] rounded-lg p-4">
                  <p className="text-xs font-semibold text-[#1E4D9C] uppercase mb-2">Pembahasan</p>
                  <KatexRenderer content={previewQ.explanation} className="prose prose-sm max-w-none text-slate-700" />
                  {getExplanationImages(previewQ.metadata).map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={resolveStorageUrl(image)}
                      alt={`Gambar pembahasan ${index + 1}`}
                      className="mt-3 max-h-80 max-w-full rounded-lg border border-blue-100 object-contain"
                    />
                  ))}
                </div>
              )}

              {/* Metadata */}
              {previewQ.metadata && Object.keys(previewQ.metadata).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Metadata</p>
                  <pre className="text-xs text-slate-600 overflow-auto">
                    {JSON.stringify(previewQ.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ── Export dropdown ─────────────────────────────────────── */
function ExportMenu({ onExport }: { onExport: (fmt: "json" | "html") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
      >
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
