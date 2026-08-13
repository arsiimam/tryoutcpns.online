import React, { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Upload, Plus, Eye, Edit2, Trash2, Copy, Download,
  ChevronDown, FileText, BookOpen, AlertCircle, CheckCircle,
  Clock, BarChart2, Search, Layers, X,
} from "lucide-react";

/* ── types ──────────────────────────────────────────────── */
interface Section { id: number; name: string; category: string | null; questionCount: number; orderNum: number; }
interface Bundle {
  id: number; name: string; description: string | null;
  category: string | null; durationMinutes: number;
  passingGrade: number; status: "draft" | "published";
  isFree: boolean; totalQuestions: number; createdAt: string; updatedAt: string;
  sections: Section[];
}
interface PreviewResult {
  name: string; category: string | null; durationMinutes: number;
  sectionCount: number; totalQuestions: number; imageCount: number;
  errors: { section: string; index: number; message: string }[];
  sections: { name: string; category: string | null; questionCount: number }[];
  preview: { content: string; answer: string | null }[];
}

const API = "/api/admin/tryouts";
const CATEGORIES = ["SKD", "SKB", "CPNS", "PPPK", "Lainnya"];
const STATUS_CLS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft:     "bg-amber-100  text-amber-700",
};

/* ═══════════════════════════════════════════════════════ */
export function AdminTryoutsPage() {
  const [bundles,  setBundles]  = useState<Bundle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [catF,     setCatF]     = useState("Semua");
  const [statusF,  setStatusF]  = useState("Semua");

  /* import modal */
  const [showImport,  setShowImport]  = useState(false);
  const [importStep,  setImportStep]  = useState<"upload"|"preview"|"done">("upload");
  const [importFile,  setImportFile]  = useState<File | null>(null);
  const [importFmt,   setImportFmt]   = useState<"json"|"html">("json");
  const [preview,     setPreview]     = useState<PreviewResult | null>(null);
  const [impLoading,  setImpLoading]  = useState(false);
  const [impError,    setImpError]    = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* create modal */
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState(""); const [cDesc, setCDesc] = useState("");
  const [cCat,  setCCat]  = useState("SKD"); const [cDur,  setCDur]  = useState(100);
  const [cPass, setCPass] = useState(311); const [cFree, setCFree] = useState(false);
  const [cSaving, setCSaving] = useState(false);

  /* edit modal */
  const [editB,    setEditB]    = useState<Bundle | null>(null);
  const [eName,    setEName]    = useState(""); const [eDesc, setEDesc] = useState("");
  const [eCat,     setECat]     = useState(""); const [eDur,  setEDur]  = useState(100);
  const [ePass,    setEPass]    = useState(0);  const [eFree, setEFree] = useState(false);
  const [eSaving, setESaving] = useState(false);

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
  const filtered = bundles.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) &&
    (catF    === "Semua" || b.category === catF) &&
    (statusF === "Semua" || b.status   === statusF)
  );

  /* ── delete ───────────────────────────────────────────── */
  const del = async (b: Bundle) => {
    if (!confirm(`Hapus tryout "${b.name}"?\nSemua ${b.totalQuestions} soal akan ikut terhapus.`)) return;
    const r = await fetch(`${API}/${b.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) setBundles(p => p.filter(x => x.id !== b.id));
  };

  /* ── toggle status ────────────────────────────────────── */
  const toggleStatus = async (b: Bundle) => {
    const next = b.status === "draft" ? "published" : "draft";
    const r = await fetch(`${API}/${b.id}/status`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) { const u = await r.json(); setBundles(p => p.map(x => x.id === u.id ? { ...x, ...u } : x)); }
  };

  /* ── duplicate ────────────────────────────────────────── */
  const duplicate = async (b: Bundle) => {
    const r = await fetch(`${API}/${b.id}/duplicate`, { method: "POST", credentials: "include" });
    if (r.ok) { const copy = await r.json(); setBundles(p => [{ ...copy, sections: [] }, ...p]); }
  };

  /* ── export ───────────────────────────────────────────── */
  const exportB = (b: Bundle, fmt: "json" | "html") =>
    window.location.assign(`${API}/${b.id}/export?format=${fmt}`);

  /* ── create ───────────────────────────────────────────── */
  const doCreate = async () => {
    if (!cName.trim()) return;
    setCSaving(true);
    const r = await fetch(API, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cName, description: cDesc, category: cCat,
                             durationMinutes: cDur, passingGrade: cPass, isFree: cFree }),
    });
    setCSaving(false);
    if (r.ok) {
      const b = await r.json();
      setBundles(p => [b, ...p]);
      setShowCreate(false); setCName(""); setCDesc(""); setCCat("SKD"); setCDur(100); setCPass(311); setCFree(false);
    }
  };

  /* ── edit ─────────────────────────────────────────────── */
  const openEdit = (b: Bundle) => {
    setEditB(b); setEName(b.name); setEDesc(b.description ?? "");
    setECat(b.category ?? ""); setEDur(b.durationMinutes); setEPass(b.passingGrade);
    setEFree(b.isFree ?? false);
  };
  const doEdit = async () => {
    if (!editB) return;
    setESaving(true);
    const r = await fetch(`${API}/${editB.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: eName, description: eDesc, category: eCat,
                             durationMinutes: eDur, passingGrade: ePass, isFree: eFree }),
    });
    setESaving(false);
    if (r.ok) { const u = await r.json(); setBundles(p => p.map(x => x.id === u.id ? { ...x, ...u } : x)); setEditB(null); }
  };

  /* ── import: preview ──────────────────────────────────── */
  const doPreview = async () => {
    if (!importFile) return;
    setImpLoading(true); setImpError("");
    try {
      const content = await importFile.text();
      const fmt     = importFile.name.endsWith(".html") ? "html" : "json";
      setImportFmt(fmt);
      const r = await fetch(`${API}/preview`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format: fmt }),
      });
      const data = await r.json();
      if (!r.ok) { setImpError(data.error ?? "Gagal memproses file."); return; }
      setPreview(data); setImportStep("preview");
    } catch (e: any) { setImpError(e.message); }
    finally { setImpLoading(false); }
  };

  /* ── import: confirm ──────────────────────────────────── */
  const doImport = async () => {
    if (!importFile) return;
    setImpLoading(true); setImpError("");
    try {
      const content = await importFile.text();
      const r = await fetch(`${API}/import`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format: importFmt }),
      });
      const data = await r.json();
      if (!r.ok) { setImpError(data.error ?? "Gagal mengimpor."); return; }
      setImportStep("done"); setBundles(p => [{ ...data.bundle, sections: [] }, ...p]);
    } catch (e: any) { setImpError(e.message); }
    finally { setImpLoading(false); }
  };

  const resetImport = () => {
    setShowImport(false); setImportStep("upload"); setImportFile(null);
    setPreview(null); setImpError(""); setImpLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <AdminLayout>
      <PageHeader
        title="Manajemen Tryout"
        description="Kelola paket tryout berbasis bundle."
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">
              <Plus size={15} /> Buat Tryout
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: "#1E4D9C" }}>
              <Upload size={15} /> Import Bundle
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Tryout",   val: bundles.length },
          { label: "Total Soal",     val: bundles.reduce((s, b) => s + b.totalQuestions, 0).toLocaleString() },
          { label: "Published",      val: bundles.filter(b => b.status === "published").length },
          { label: "Draft",          val: bundles.filter(b => b.status === "draft").length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm mb-4 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Cari nama tryout..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
        </div>
        <select value={catF} onChange={e => setCatF(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none">
          <option value="Semua">Semua Kategori</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none">
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
            <Layers size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada bundle tryout</p>
            <p className="text-sm mt-1">Buat atau import bundle untuk memulai.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Nama Tryout</th>
                <th className="px-4 py-3">Komposisi Soal</th>
                <th className="px-4 py-3 text-center">Durasi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Diperbarui</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => (
                <tr key={b.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/admin/tryouts/${b.id}`)}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{b.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.category && (
                        <span className="px-1.5 py-0.5 bg-[#dce8f5] text-[#0A1C3C] text-xs font-bold rounded">
                          {b.category}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {b.totalQuestions} soal total
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {b.sections.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {b.sections.map(s => (
                          <span key={s.id}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">
                            {s.name}: {s.questionCount}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-600">
                      <Clock size={13} className="text-slate-400" />
                      <span className="font-medium">{b.durationMinutes}</span>
                      <span className="text-slate-400 text-xs">mnt</span>
                    </div>
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleStatus(b)}
                      className={`px-2.5 py-1 text-xs font-bold rounded uppercase cursor-pointer ${STATUS_CLS[b.status]}`}
                      title="Klik untuk toggle status">
                      {b.status}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400">
                    {new Date(b.updatedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/tryouts/${b.id}`}>
                        <button title="Lihat Detail" className="p-1.5 rounded hover:bg-[#dce8f5] text-[#1E4D9C]"><Eye size={15} /></button>
                      </Link>
                      <button title="Edit" onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Edit2 size={15} /></button>
                      <button title="Duplikasi" onClick={() => duplicate(b)} className="p-1.5 rounded hover:bg-purple-50 text-purple-500"><Copy size={15} /></button>
                      <ExportMenu b={b} onExport={exportB} />
                      <button title="Hapus" onClick={() => del(b)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
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
        <Modal onClose={resetImport} title="Import Bundle Tryout">
          {importStep === "upload" && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">
                Upload file bundle tryout lengkap (JSON atau HTML). Seluruh konfigurasi dan soal akan diimpor otomatis.
              </p>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-[#dce8f5] transition-colors">
                <Upload size={32} className="mx-auto mb-3 text-slate-300" />
                {importFile
                  ? <p className="font-semibold text-slate-700">{importFile.name}</p>
                  : <><p className="font-medium text-slate-500">Klik untuk pilih file</p>
                     <p className="text-xs text-slate-400 mt-1">.json atau .html</p></>}
                <input ref={fileRef} type="file" accept=".json,.html" className="hidden"
                  onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImpError(""); }} />
              </div>
              {impError && <div className="flex gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />{impError}</div>}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                <p className="font-semibold text-slate-600 mb-1">Format file:</p>
                <p>• <strong>JSON</strong> — lihat <code>docs/examples/tryout-skd-example.json</code></p>
                <p>• Spesifikasi lengkap: <code>docs/tryout-bundle-format.md</code></p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={resetImport} className="px-4 py-2 border rounded-lg text-sm font-medium">Batal</button>
                <button onClick={doPreview} disabled={!importFile || impLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#1E4D9C" }}>
                  {impLoading ? "Memproses..." : "Preview →"}
                </button>
              </div>
            </div>
          )}

          {importStep === "preview" && preview && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Seksi",  val: preview.sectionCount },
                  { label: "Soal",   val: preview.totalQuestions },
                  { label: "Gambar", val: preview.imageCount },
                  { label: "Error",  val: preview.errors.length },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className={`text-xl font-bold ${s.label === "Error" && s.val > 0 ? "text-red-600" : "text-slate-800"}`}>{s.val}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Nama:</span> {preview.name}</p>
                {preview.category && <p><span className="font-semibold">Kategori:</span> {preview.category}</p>}
                <p><span className="font-semibold">Durasi:</span> {preview.durationMinutes} menit</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Komposisi Seksi</p>
                <div className="flex flex-wrap gap-2">
                  {preview.sections.map((s, i) => (
                    <div key={i} className="px-3 py-1.5 bg-[#dce8f5] rounded-lg text-xs text-[#0A1C3C] font-medium">
                      {s.name}: <strong>{s.questionCount}</strong> soal
                    </div>
                  ))}
                </div>
              </div>
              {preview.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={14} /> {preview.errors.length} soal bermasalah
                  </p>
                  {preview.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">[{e.section}] Soal #{e.index}: {e.message}</p>
                  ))}
                </div>
              )}
              {preview.preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Preview Soal</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {preview.preview.map((q, i) => (
                      <div key={i} className="text-xs bg-slate-50 rounded-lg p-3">
                        <span className="text-slate-400 mr-2">#{i + 1}</span>
                        <span className="text-slate-700">{q.content}</span>
                        {q.answer && <span className="ml-2 text-emerald-600 font-bold">Jwb: {q.answer}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {impError && <div className="flex gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />{impError}</div>}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setImportStep("upload"); setImpError(""); }}
                  className="px-4 py-2 border rounded-lg text-sm font-medium">← Kembali</button>
                <button onClick={doImport} disabled={impLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#1E4D9C" }}>
                  {impLoading ? "Mengimpor..." : `Import ${preview.totalQuestions} Soal`}
                </button>
              </div>
            </div>
          )}

          {importStep === "done" && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-500" />
              <p className="font-semibold text-slate-800">Bundle tryout berhasil diimpor!</p>
              <p className="text-sm text-slate-500">
                <strong>{preview?.name}</strong> — {preview?.totalQuestions} soal dalam {preview?.sectionCount} seksi.
              </p>
              <button onClick={resetImport} className="px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#1E4D9C" }}>
                Tutup
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* ══ CREATE MODAL ══ */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Buat Tryout Baru">
          <div className="space-y-4">
            <Field label="Nama Tryout" required>
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder="SKD Nasional #1"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
            </Field>
            <Field label="Kategori">
              <select value={cCat} onChange={e => setCCat(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durasi (menit)">
                <input type="number" value={cDur} onChange={e => setCDur(Number(e.target.value))} min={1}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
              </Field>
              <Field label="Passing Grade">
                <input type="number" value={cPass} onChange={e => setCPass(Number(e.target.value))} min={0}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
              </Field>
            </div>
            <Field label="Deskripsi">
              <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
              <input type="checkbox" checked={cFree} onChange={e => setCFree(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              <span>Akses <strong>Gratis</strong> (tidak perlu berlangganan)</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm font-medium">Batal</button>
              <button onClick={doCreate} disabled={cSaving || !cName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#1E4D9C" }}>
                {cSaving ? "Menyimpan..." : "Buat Tryout"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editB && (
        <Modal onClose={() => setEditB(null)} title="Edit Tryout">
          <div className="space-y-4">
            <Field label="Nama Tryout" required>
              <input value={eName} onChange={e => setEName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
            </Field>
            <Field label="Kategori">
              <select value={eCat} onChange={e => setECat(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none">
                <option value="">Pilih...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Durasi (menit)">
                <input type="number" value={eDur} onChange={e => setEDur(Number(e.target.value))} min={1}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
              </Field>
              <Field label="Passing Grade">
                <input type="number" value={ePass} onChange={e => setEPass(Number(e.target.value))} min={0}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
              </Field>
            </div>
            <Field label="Deskripsi">
              <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E4D9C] focus:outline-none" />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
              <input type="checkbox" checked={eFree} onChange={e => setEFree(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              <span>Akses <strong>Gratis</strong> (tidak perlu berlangganan)</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditB(null)} className="px-4 py-2 border rounded-lg text-sm font-medium">Batal</button>
              <button onClick={doEdit} disabled={eSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#1E4D9C" }}>
                {eSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
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
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
