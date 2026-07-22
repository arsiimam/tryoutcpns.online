import React, { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Upload, FileText, Eye, Edit2, Trash2, Download, X,
  BookOpen, Search, ChevronDown, AlertCircle, CheckCircle,
  Plus, FolderOpen,
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

interface PreviewResult {
  bundleName: string;
  category: string | null;
  description: string | null;
  questionCount: number;
  imageCount: number;
  errors: { index: number; message: string }[];
  preview: { order: number; type: string; content: string; answer: string | null }[];
}

const API = "/api/admin/bundles";
const CATEGORIES = ["TWK", "TIU", "TKP", "Campuran", "Lainnya"];

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft:     "bg-amber-100  text-amber-700",
};

/* ═══════════════════════════════════════════════════════ */
export function AdminQuestionsPage() {
  const [bundles, setBundles]   = useState<Bundle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("Semua");

  /* Import modal */
  const [showImport, setShowImport]     = useState(false);
  const [importStep, setImportStep]     = useState<"upload" | "preview" | "done">("upload");
  const [importFile, setImportFile]     = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<"json" | "html">("json");
  const [previewData, setPreviewData]   = useState<PreviewResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* Edit modal */
  const [editBundle,  setEditBundle]  = useState<Bundle | null>(null);
  const [editName,    setEditName]    = useState("");
  const [editDesc,    setEditDesc]    = useState("");
  const [editCat,     setEditCat]     = useState("");
  const [editSaving,  setEditSaving]  = useState(false);

  /* ── load ─────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(API, { credentials: "include" });
      if (r.ok) setBundles(await r.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── filters ──────────────────────────────────────────── */
  const filtered = bundles.filter(b => {
    const matchQ  = b.name.toLowerCase().includes(search.toLowerCase());
    const matchC  = catFilter    === "Semua" || b.category === catFilter;
    const matchS  = statusFilter === "Semua" || b.status   === statusFilter;
    return matchQ && matchC && matchS;
  });

  /* ── delete ───────────────────────────────────────────── */
  const handleDelete = async (b: Bundle) => {
    if (!confirm(`Hapus bundle "${b.name}"?\nSemua ${b.questionCount} soal di dalamnya akan ikut terhapus.`)) return;
    const r = await fetch(`${API}/${b.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) setBundles(prev => prev.filter(x => x.id !== b.id));
  };

  /* ── status toggle ────────────────────────────────────── */
  const toggleStatus = async (b: Bundle) => {
    const next = b.status === "draft" ? "published" : "draft";
    const r = await fetch(`${API}/${b.id}/status`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) {
      const updated = await r.json();
      setBundles(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
  };

  /* ── export ───────────────────────────────────────────── */
  const exportBundle = (b: Bundle, fmt: "json" | "html") => {
    window.location.href = `${API}/${b.id}/export?format=${fmt}`;
  };

  /* ── edit save ────────────────────────────────────────── */
  const openEdit = (b: Bundle) => {
    setEditBundle(b); setEditName(b.name);
    setEditDesc(b.description ?? ""); setEditCat(b.category ?? "");
  };
  const saveEdit = async () => {
    if (!editBundle) return;
    setEditSaving(true);
    const r = await fetch(`${API}/${editBundle.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc, category: editCat }),
    });
    setEditSaving(false);
    if (r.ok) {
      const updated = await r.json();
      setBundles(prev => prev.map(x => x.id === updated.id ? updated : x));
      setEditBundle(null);
    }
  };

  /* ── import: preview ──────────────────────────────────── */
  const doPreview = async () => {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const content = await importFile.text();
      const fmt     = importFile.name.endsWith(".html") ? "html" : "json";
      setImportFormat(fmt);
      const r = await fetch(`${API}/preview`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format: fmt }),
      });
      const data = await r.json();
      if (!r.ok) { setImportError(data.error ?? "Gagal memproses file."); return; }
      setPreviewData(data);
      setImportStep("preview");
    } catch (e: any) {
      setImportError(e.message ?? "Terjadi kesalahan.");
    } finally { setImportLoading(false); }
  };

  /* ── import: confirm ──────────────────────────────────── */
  const doImport = async () => {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const content = await importFile.text();
      const r = await fetch(`${API}/import`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format: importFormat }),
      });
      const data = await r.json();
      if (!r.ok) { setImportError(data.error ?? "Gagal mengimpor."); return; }
      setImportStep("done");
      setBundles(prev => [data.bundle, ...prev]);
    } catch (e: any) {
      setImportError(e.message ?? "Terjadi kesalahan.");
    } finally { setImportLoading(false); }
  };

  const resetImport = () => {
    setShowImport(false); setImportStep("upload");
    setImportFile(null); setPreviewData(null);
    setImportError(""); setImportLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <AdminLayout>
      <PageHeader
        title="Bank Soal"
        description="Kelola bundle soal untuk tryout dan latihan."
        action={
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm"
            style={{ background: "#4f5eea" }}
          >
            <Upload size={16} /> Import Bundle
          </button>
        }
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Bundle",     val: bundles.length },
          { label: "Total Soal",       val: bundles.reduce((s, b) => s + b.questionCount, 0).toLocaleString() },
          { label: "Published",        val: bundles.filter(b => b.status === "published").length },
          { label: "Draft",            val: bundles.filter(b => b.status === "draft").length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm mb-4 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama bundle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="Semua">Semua Kategori</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="Semua">Semua Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Bundle table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada bundle</p>
            <p className="text-sm mt-1">Import bundle pertama Anda dengan tombol di atas.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Bundle</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-center">Soal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Diperbarui</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 leading-tight">{b.name}</div>
                    {b.description && (
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{b.description}</div>
                    )}
                  </td>
                  {/* Category */}
                  <td className="px-4 py-4">
                    {b.category ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase">
                        {b.category}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  {/* Count */}
                  <td className="px-4 py-4 text-center font-semibold text-slate-700">
                    {b.questionCount.toLocaleString()}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleStatus(b)}
                      className={`px-2.5 py-1 text-xs font-bold rounded uppercase cursor-pointer ${STATUS_STYLE[b.status]}`}
                      title="Klik untuk toggle status"
                    >
                      {b.status}
                    </button>
                  </td>
                  {/* Date */}
                  <td className="px-4 py-4 text-xs text-slate-400">
                    {new Date(b.updatedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/questions/${b.id}`}>
                        <button title="Lihat Soal" className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                          <Eye size={15} />
                        </button>
                      </Link>
                      <button title="Edit" onClick={() => openEdit(b)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                        <Edit2 size={15} />
                      </button>
                      <ExportMenu b={b} onExport={exportBundle} />
                      <button title="Hapus" onClick={() => handleDelete(b)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ IMPORT MODAL ══ */}
      {showImport && (
        <Modal onClose={resetImport} title="Import Bundle Soal">
          {importStep === "upload" && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">
                Upload file bundle untuk membuat kumpulan soal baru. Format yang didukung: <strong>JSON</strong> dan <strong>HTML</strong>.
              </p>
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-300" />
                {importFile ? (
                  <p className="font-semibold text-slate-700">{importFile.name}</p>
                ) : (
                  <>
                    <p className="font-medium text-slate-500">Klik untuk pilih file</p>
                    <p className="text-xs text-slate-400 mt-1">.json atau .html — maks 10 MB</p>
                  </>
                )}
                <input
                  ref={fileRef} type="file" accept=".json,.html"
                  className="hidden"
                  onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImportError(""); }}
                />
              </div>

              {importError && (
                <div className="flex gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {importError}
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-600">Format file:</p>
                <p>• <strong>JSON</strong> — format utama, lihat <code>docs/examples/bundle-twk-example.json</code></p>
                <p>• <strong>HTML</strong> — format sekunder, lihat <code>docs/examples/bundle-tiu-example.html</code></p>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={resetImport} className="px-4 py-2 border rounded-lg text-sm font-medium">Batal</button>
                <button
                  onClick={doPreview}
                  disabled={!importFile || importLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#4f5eea" }}
                >
                  {importLoading ? "Memproses..." : "Preview →"}
                </button>
              </div>
            </div>
          )}

          {importStep === "preview" && previewData && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Soal", val: previewData.questionCount },
                  { label: "Gambar", val: previewData.imageCount },
                  { label: "Error", val: previewData.errors.length },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className={`text-xl font-bold ${s.label === "Error" && s.val > 0 ? "text-red-600" : "text-slate-800"}`}>{s.val}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Nama Bundle:</span> {previewData.bundleName}</p>
                {previewData.category && <p><span className="font-semibold">Kategori:</span> {previewData.category}</p>}
                {previewData.description && <p><span className="font-semibold">Deskripsi:</span> {previewData.description}</p>}
              </div>

              {/* Errors */}
              {previewData.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={14} /> {previewData.errors.length} soal bermasalah
                  </p>
                  {previewData.errors.map(e => (
                    <p key={e.index} className="text-xs text-red-600">Soal #{e.index}: {e.message}</p>
                  ))}
                </div>
              )}

              {/* Preview questions */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Preview {previewData.preview.length} soal pertama
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {previewData.preview.map(q => (
                    <div key={q.order} className="text-xs bg-slate-50 rounded-lg p-3">
                      <span className="font-bold text-slate-400 mr-2">#{q.order}</span>
                      <span className="text-slate-700">{q.content}</span>
                      {q.answer && <span className="ml-2 text-emerald-600 font-bold">Jwb: {q.answer}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {importError && (
                <div className="flex gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />{importError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => { setImportStep("upload"); setImportError(""); }}
                  className="px-4 py-2 border rounded-lg text-sm font-medium">← Kembali</button>
                <button
                  onClick={doImport}
                  disabled={importLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#4f5eea" }}
                >
                  {importLoading ? "Mengimpor..." : `Import ${previewData.questionCount} Soal`}
                </button>
              </div>
            </div>
          )}

          {importStep === "done" && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <p className="font-semibold text-slate-800">Bundle berhasil diimpor!</p>
              <p className="text-sm text-slate-500">
                {previewData?.questionCount} soal telah ditambahkan ke bundle <strong>{previewData?.bundleName}</strong>.
              </p>
              <button onClick={resetImport}
                className="px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#4f5eea" }}>
                Tutup
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editBundle && (
        <Modal onClose={() => setEditBundle(null)} title="Edit Bundle">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Bundle</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select value={editCat} onChange={e => setEditCat(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">Pilih kategori...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deskripsi</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditBundle(null)} className="px-4 py-2 border rounded-lg text-sm font-medium">Batal</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#4f5eea" }}>
                {editSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function ExportMenu({ b, onExport }: { b: Bundle; onExport: (b: Bundle, fmt: "json" | "html") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button title="Export" onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 flex items-center gap-0.5">
        <Download size={15} /><ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-20 py-1 text-sm">
            <button onClick={() => { onExport(b, "json"); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2">
              <FileText size={13} /> JSON
            </button>
            <button onClick={() => { onExport(b, "html"); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2">
              <BookOpen size={13} /> HTML
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
