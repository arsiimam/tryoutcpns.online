import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Upload, FileText, Eye, Edit2, Trash2, Download, X,
  BookOpen, Search, AlertCircle, CheckCircle,
  Plus, ChevronDown, ChevronRight, Folder, FolderOpen,
  GripVertical, ArrowRight, Crown, Lock,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────── */
interface Bundle {
  id: number;
  parentId: number | null;
  name: string;
  description: string | null;
  category: string | null;
  status: "draft" | "published";
  isPremium: boolean;
  questionCount: number;
  sortOrder: number;
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

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft:     "bg-amber-100  text-amber-700",
};

/* ── Tree helpers ───────────────────────────────────────── */
interface TreeNode extends Bundle { children: TreeNode[] }

function buildTree(bundles: Bundle[]): TreeNode[] {
  const map: Record<number, TreeNode> = {};
  bundles.forEach(b => { map[b.id] = { ...b, children: [] }; });
  const roots: TreeNode[] = [];
  bundles.forEach(b => {
    if (b.parentId && map[b.parentId]) map[b.parentId].children.push(map[b.id]);
    else roots.push(map[b.id]);
  });
  return roots;
}

/* ═══════════════════════════════════════════════════════ */
export function AdminQuestionsPage() {
  const [bundles,  setBundles]  = useState<Bundle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  /* Create / Edit modal */
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<Bundle | null>(null);
  const [mName,       setMName]       = useState("");
  const [mDesc,       setMDesc]       = useState("");
  const [mCat,        setMCat]        = useState("");
  const [mParentId,   setMParentId]   = useState<string>("");
  const [mIsPremium,  setMIsPremium]  = useState(false);
  const [mSaving,     setMSaving]     = useState(false);
  const [mError,      setMError]      = useState("");

  /* Import modal */
  const [showImport,    setShowImport]    = useState(false);
  const [importStep,    setImportStep]    = useState<"upload"|"preview"|"done">("upload");
  const [importFile,    setImportFile]    = useState<File | null>(null);
  const [importFormat,  setImportFormat]  = useState<"json"|"html">("json");
  const [previewData,   setPreviewData]   = useState<PreviewResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError,   setImportError]   = useState("");
  /* parentId for imported bundle */
  const [importParentId, setImportParentId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── load ─────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(API, { credentials: "include" });
      if (r.ok) setBundles(await r.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── expand all roots on first load ── */
  useEffect(() => {
    if (bundles.length > 0 && expanded.size === 0) {
      const rootIds = bundles.filter(b => !b.parentId).map(b => b.id);
      setExpanded(new Set(rootIds));
    }
  }, [bundles]);

  const toggleExpand = (id: number) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  /* ── delete ───────────────────────────────────────────── */
  const handleDelete = async (b: Bundle) => {
    const childCount = bundles.filter(x => x.parentId === b.id).length;
    const msg = childCount > 0
      ? `Hapus grup "${b.name}"?\n${childCount} sub-bundle di dalamnya juga akan terhapus.`
      : `Hapus bundle "${b.name}"?\nSemua ${b.questionCount} soal di dalamnya akan ikut terhapus.`;
    if (!confirm(msg)) return;
    const r = await fetch(`${API}/${b.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { setBundles(prev => prev.filter(x => x.id !== b.id && x.parentId !== b.id)); }
  };

  /* ── status toggle ──────────────────────────────────── */
  const toggleStatus = async (b: Bundle) => {
    const next = b.status === "draft" ? "published" : "draft";
    const r = await fetch(`${API}/${b.id}/status`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) setBundles(prev => prev.map(x => x.id === b.id ? { ...x, status: next } : x));
  };

  /* ── open create / edit modal ───────────────────────── */
  const openCreate = (defaultParentId?: number) => {
    setEditTarget(null);
    setMName(""); setMDesc(""); setMCat(""); setMIsPremium(false);
    setMParentId(defaultParentId ? String(defaultParentId) : "");
    setMError(""); setShowModal(true);
  };
  const openEdit = (b: Bundle) => {
    setEditTarget(b);
    setMName(b.name); setMDesc(b.description ?? ""); setMCat(b.category ?? "");
    setMParentId(b.parentId ? String(b.parentId) : "");
    setMIsPremium(b.isPremium ?? false);
    setMError(""); setShowModal(true);
  };

  /* ── save (create or edit) ──────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMSaving(true); setMError("");
    try {
      const payload = {
        name: mName.trim(), description: mDesc.trim() || null,
        category: mCat.trim() || null,
        parentId: mParentId ? Number(mParentId) : null,
        isPremium: mIsPremium,
      };
      const url   = editTarget ? `${API}/${editTarget.id}` : API;
      const method = editTarget ? "PUT" : "POST";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setMError(d.error ?? "Gagal menyimpan."); return; }
      if (editTarget) setBundles(prev => prev.map(x => x.id === d.id ? d : x));
      else { setBundles(prev => [...prev, d]); setExpanded(s => new Set([...s, d.parentId ?? d.id])); }
      setShowModal(false);
    } finally { setMSaving(false); }
  };

  /* ── export ─────────────────────────────────────────── */
  const handleExport = (b: Bundle, fmt: "json"|"html") => {
    window.location.href = `${API}/${b.id}/export?format=${fmt}`;
  };

  /* ── import preview ──────────────────────────────────── */
  const handlePreview = async () => {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const text = await importFile.text();
      const r = await fetch(`${API}/preview`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, format: importFormat }),
      });
      const d = await r.json();
      if (!r.ok) { setImportError(d.error ?? "Gagal preview."); return; }
      setPreviewData(d); setImportStep("preview");
    } finally { setImportLoading(false); }
  };

  /* ── import confirm ──────────────────────────────────── */
  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImportLoading(true); setImportError("");
    try {
      const text = await importFile.text();
      const r = await fetch(`${API}/import`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, format: importFormat, parentId: importParentId ? Number(importParentId) : null }),
      });
      const d = await r.json();
      if (!r.ok) { setImportError(d.error ?? "Gagal import."); return; }
      setBundles(prev => [...prev, d.bundle]);
      setImportStep("done");
    } finally { setImportLoading(false); }
  };

  /* ── search filter (flat) ────────────────────────────── */
  const q = search.toLowerCase();
  const filteredBundles = q
    ? bundles.filter(b => b.name.toLowerCase().includes(q) || (b.category ?? "").toLowerCase().includes(q))
    : bundles;

  const tree = buildTree(filteredBundles);

  /* ── root bundles (for parent selector) ─────────────── */
  const rootBundles = bundles.filter(b => !b.parentId);

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <AdminLayout>
      <PageHeader
        title="Bank Soal"
        subtitle="Klik nama bundle untuk membuka editor soal. Buat Grup untuk mengelompokkan beberapa bundle."
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setShowImport(true); setImportStep("upload"); setImportFile(null); setPreviewData(null); setImportError(""); setImportParentId(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <Upload size={15} /> Import
            </button>
            <button onClick={() => openCreate()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus size={15} /> Bundle Baru
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari bundle..."
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        />
      </div>

      {/* Bundle tree */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      ) : tree.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-semibold">Belum ada bundle</p>
          <p className="text-slate-400 text-sm mt-1">Klik "Bundle Baru" untuk membuat bundle pertama.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map((root) => (
            <RootBundleCard
              key={root.id}
              node={root}
              expanded={expanded}
              onToggle={toggleExpand}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleStatus={toggleStatus}
              onExport={handleExport}
              onAddChild={openCreate}
            />
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ────────────────────────────── */}
      {showModal && (
        <Modal title={editTarget ? "Edit Bundle" : "Bundle Baru"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Bundle <span className="text-red-500">*</span></label>
              <input value={mName} onChange={e => setMName(e.target.value)} required
                placeholder="Contoh: Bundle TWK, TWK 001, …"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi</label>
              <textarea value={mDesc} onChange={e => setMDesc(e.target.value)} rows={2}
                placeholder="Opsional"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
                <input value={mCat} onChange={e => setMCat(e.target.value)}
                  placeholder="TWK / TIU / TKP / …"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Grup Induk</label>
                <select value={mParentId} onChange={e => setMParentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option value="">— Tidak ada (root) —</option>
                  {rootBundles
                    .filter(b => !editTarget || b.id !== editTarget.id)
                    .map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
              </div>
            </div>
            {/* Premium toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors">
              <input type="checkbox" checked={mIsPremium} onChange={e => setMIsPremium(e.target.checked)}
                className="w-4 h-4 accent-amber-500" />
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 text-sm">
                  <Crown size={14} className="text-amber-500" /> Bundle Premium (Berbayar)
                </div>
                <div className="text-xs text-amber-600 mt-0.5">Hanya pengguna berlangganan yang bisa mengakses soal ini.</div>
              </div>
            </label>
            {mError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={15} /> {mError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Batal
              </button>
              <button type="submit" disabled={mSaving}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {mSaving ? "Menyimpan…" : editTarget ? "Simpan" : "Buat Bundle"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Import Modal ──────────────────────────────────── */}
      {showImport && (
        <Modal title="Import Bundle Soal" onClose={() => setShowImport(false)}>
          {importStep === "upload" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {(["json","html"] as const).map(f => (
                  <button key={f} onClick={() => setImportFormat(f)}
                    className={`px-4 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${importFormat === f ? "bg-primary text-white border-primary" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Masukkan ke Grup</label>
                <select value={importParentId} onChange={e => setImportParentId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option value="">— Tidak ada (root) —</option>
                  {rootBundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                {importFile
                  ? <p className="font-semibold text-slate-700">{importFile.name}</p>
                  : <p className="text-slate-500 text-sm">Klik untuk pilih file <span className="font-semibold">.{importFormat}</span></p>
                }
              </div>
              <input ref={fileRef} type="file" accept={`.${importFormat}`} className="hidden"
                onChange={e => { setImportFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              {importError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={15} /> {importError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowImport(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
                <button onClick={handlePreview} disabled={!importFile || importLoading}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                  {importLoading ? "Memproses…" : "Preview"}
                </button>
              </div>
            </div>
          )}

          {importStep === "preview" && previewData && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
                <p><span className="font-semibold">Nama:</span> {previewData.bundleName}</p>
                <p><span className="font-semibold">Kategori:</span> {previewData.category ?? "—"}</p>
                <p><span className="font-semibold">Jumlah soal:</span> {previewData.questionCount}</p>
                {previewData.imageCount > 0 && <p><span className="font-semibold">Gambar:</span> {previewData.imageCount}</p>}
              </div>
              {previewData.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <p className="font-semibold mb-1">{previewData.errors.length} peringatan:</p>
                  {previewData.errors.slice(0,3).map(e => <p key={e.index}>• Soal #{e.index}: {e.message}</p>)}
                </div>
              )}
              <div className="space-y-2">
                {previewData.preview.map((p, i) => (
                  <div key={i} className="border rounded-lg p-3 text-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase">Soal {p.order}</span>
                    <p className="mt-1 text-slate-700 line-clamp-2">{p.content}</p>
                  </div>
                ))}
              </div>
              {importError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={15} /> {importError}
                </div>
              )}
              <div className="flex justify-between">
                <button onClick={() => setImportStep("upload")}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold text-slate-700 hover:bg-slate-50">Kembali</button>
                <button onClick={handleImportConfirm} disabled={importLoading}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                  {importLoading ? "Menyimpan…" : "Simpan Bundle"}
                </button>
              </div>
            </div>
          )}

          {importStep === "done" && (
            <div className="text-center py-6">
              <CheckCircle size={48} className="mx-auto text-emerald-500 mb-3" />
              <p className="font-bold text-slate-800 text-lg">Bundle berhasil diimport!</p>
              <p className="text-slate-500 text-sm mt-1">Bundle tersimpan sebagai <em>draft</em>. Publish jika sudah siap.</p>
              <button onClick={() => { setShowImport(false); load(); }}
                className="mt-5 px-6 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90">
                Selesai
              </button>
            </div>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}

/* ══════════════════════════════════════════════════════════
   RootBundleCard — shows a root (or flat) bundle row
══════════════════════════════════════════════════════════ */
interface CardProps {
  node: TreeNode;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (b: Bundle) => void;
  onDelete: (b: Bundle) => void;
  onToggleStatus: (b: Bundle) => void;
  onExport: (b: Bundle, fmt: "json"|"html") => void;
  onAddChild: (parentId: number) => void;
}

function RootBundleCard({ node, expanded, onToggle, onEdit, onDelete, onToggleStatus, onExport, onAddChild }: CardProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const [, navigate] = useLocation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Root row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Expand toggle (folder) or spacer */}
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${hasChildren ? "hover:bg-slate-100 text-slate-600 cursor-pointer" : "text-slate-300 cursor-default"}`}
        >
          {hasChildren
            ? (isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />)
            : <BookOpen size={16} />
          }
        </button>

        {/* Folder/bundle icon */}
        <div className="shrink-0">
          {hasChildren
            ? (isOpen ? <FolderOpen size={20} className="text-amber-500" /> : <Folder size={20} className="text-amber-500" />)
            : <FileText size={20} className="text-blue-500" />
          }
        </div>

        {/* Name + meta */}
        {/* Folder (punya anak): klik nama = toggle expand. Leaf: klik = buka editor soal */}
        <div
          onClick={() => hasChildren ? onToggle(node.id) : navigate(`/admin/questions/${node.id}`)}
          className="flex-1 min-w-0 group/name cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm group-hover/name:text-primary transition-colors">{node.name}</span>
            {node.category && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                {node.category}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[node.status]}`}>
              {node.status}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {hasChildren
              ? `${node.children.length} sub-bundle · klik untuk buka`
              : `${node.questionCount} soal · klik untuk input soal`
            }
            {node.description && ` · ${node.description}`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onAddChild(node.id)} title="Tambah sub-bundle"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <Plus size={15} />
          </button>
          <button onClick={() => onEdit(node)} title="Edit"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <Edit2 size={15} />
          </button>
          {!hasChildren && (
            <>
              <button onClick={() => onToggleStatus(node)} title={node.status === "draft" ? "Publish" : "Jadikan Draft"}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                {node.status === "draft" ? <CheckCircle size={15} className="text-emerald-600" /> : <AlertCircle size={15} className="text-amber-500" />}
              </button>
              <ExportMenu b={node} onExport={onExport} />
            </>
          )}
          <button onClick={() => onDelete(node)} title="Hapus"
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div className="border-t bg-slate-50/60">
          {node.children.map((child, idx) => (
            <ChildBundleRow
              key={child.id}
              bundle={child}
              isLast={idx === node.children.length - 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              onExport={onExport}
            />
          ))}
          {/* Add child button */}
          <button
            onClick={() => onAddChild(node.id)}
            className="w-full flex items-center gap-2 px-5 py-3 text-sm text-slate-400 hover:text-primary hover:bg-white transition-colors border-t"
          >
            <Plus size={14} /> Tambah sub-bundle ke <strong>{node.name}</strong>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Child row (leaf bundle inside a root) ───────────── */
function ChildBundleRow({
  bundle, isLast,
  onEdit, onDelete, onToggleStatus, onExport,
}: {
  bundle: Bundle; isLast: boolean;
  onEdit: (b: Bundle) => void; onDelete: (b: Bundle) => void;
  onToggleStatus: (b: Bundle) => void; onExport: (b: Bundle, fmt: "json"|"html") => void;
}) {
  const [, navigate] = useLocation();
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-b border-slate-100" : ""} hover:bg-white transition-colors group/row`}>
      {/* Indent */}
      <div className="w-8 shrink-0 flex items-center justify-center">
        <ArrowRight size={14} className="text-slate-300" />
      </div>
      <FileText size={16} className="shrink-0 text-blue-400" />

      {/* Info — SELURUH AREA INI BISA DIKLIK → buka editor soal */}
      <div onClick={() => navigate(`/admin/questions/${bundle.id}`)} className="flex-1 min-w-0 cursor-pointer">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-700 text-sm group-hover/row:text-primary transition-colors">{bundle.name}</span>
          {bundle.category && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded font-medium">{bundle.category}</span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[bundle.status]}`}>
            {bundle.status}
          </span>
          {bundle.isPremium && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-semibold">
              <Crown size={10} /> Premium
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {bundle.questionCount} soal · klik untuk input soal
          {bundle.description ? ` · ${bundle.description}` : ""}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(bundle)} title="Edit"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <Edit2 size={15} />
        </button>
        <button onClick={() => onToggleStatus(bundle)} title={bundle.status === "draft" ? "Publish" : "Jadikan Draft"}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          {bundle.status === "draft" ? <CheckCircle size={15} className="text-emerald-600" /> : <AlertCircle size={15} className="text-amber-500" />}
        </button>
        <ExportMenu b={bundle} onExport={onExport} />
        <button onClick={() => onDelete(bundle)} title="Hapus"
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ── Export dropdown ──────────────────────────────────── */
function ExportMenu({ b, onExport }: { b: Bundle; onExport: (b: Bundle, fmt: "json"|"html") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button title="Export" onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center gap-0.5">
        <Download size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-32 bg-white border rounded-xl shadow-lg z-20 py-1 text-sm">
            <button onClick={() => { onExport(b, "json"); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
              <FileText size={13} /> JSON
            </button>
            <button onClick={() => { onExport(b, "html"); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2">
              <BookOpen size={13} /> HTML
            </button>
          </div>
        </>
      )}
    </div>
  );
}


/* ── Modal wrapper ────────────────────────────────────── */
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
