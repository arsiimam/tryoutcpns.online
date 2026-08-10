import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { Plus, Edit2, Trash2, X, Layers, Tag } from "lucide-react";

interface Category {
  id: number; name: string; code: string; description: string | null;
  createdAt: string;
}
interface Subcategory {
  id: number; categoryId: number; name: string; description: string | null;
  createdAt: string;
}

const emptyCatForm  = { name: "", code: "", description: "" };
const emptySubForm  = { categoryId: "", name: "", description: "" };

export function AdminCategoriesPage() {
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading,       setLoading]       = useState(true);

  /* ── modals ── */
  const [catModal,  setCatModal]  = useState(false);
  const [subModal,  setSubModal]  = useState(false);
  const [catForm,   setCatForm]   = useState({ ...emptyCatForm });
  const [subForm,   setSubForm]   = useState({ ...emptySubForm });
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editSubId, setEditSubId] = useState<number | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [delCat,    setDelCat]    = useState<number | null>(null);
  const [delSub,    setDelSub]    = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [cR, sR] = await Promise.all([
        fetch("/api/admin/categories",    { credentials: "include" }),
        fetch("/api/admin/subcategories", { credentials: "include" }),
      ]);
      setCategories(cR.ok    ? await cR.json() : []);
      setSubcategories(sR.ok ? await sR.json() : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  /* ── kategori ── */
  function openCreateCat() {
    setEditCatId(null); setCatForm({ ...emptyCatForm }); setError(null); setCatModal(true);
  }
  function openEditCat(c: Category) {
    setEditCatId(c.id);
    setCatForm({ name: c.name, code: c.code, description: c.description ?? "" });
    setError(null); setCatModal(true);
  }
  async function saveCat(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const url    = editCatId ? `/api/admin/categories/${editCatId}` : "/api/admin/categories";
      const method = editCatId ? "PUT" : "POST";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Gagal menyimpan."); return; }
      setCatModal(false); load();
    } catch { setError("Terjadi kesalahan."); }
    finally { setSaving(false); }
  }
  async function deleteCat(id: number) {
    const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) { const d = await r.json(); alert(d.error ?? "Gagal menghapus."); return; }
    setDelCat(null); load();
  }

  /* ── subkategori ── */
  function openCreateSub(categoryId?: number) {
    setEditSubId(null);
    setSubForm({ ...emptySubForm, categoryId: categoryId ? String(categoryId) : "" });
    setError(null); setSubModal(true);
  }
  function openEditSub(s: Subcategory) {
    setEditSubId(s.id);
    setSubForm({ categoryId: String(s.categoryId), name: s.name, description: s.description ?? "" });
    setError(null); setSubModal(true);
  }
  async function saveSub(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const url    = editSubId ? `/api/admin/subcategories/${editSubId}` : "/api/admin/subcategories";
      const method = editSubId ? "PUT" : "POST";
      const r = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subForm),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Gagal menyimpan."); return; }
      setSubModal(false); load();
    } catch { setError("Terjadi kesalahan."); }
    finally { setSaving(false); }
  }
  async function deleteSub(id: number) {
    const r = await fetch(`/api/admin/subcategories/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) { const d = await r.json(); alert(d.error ?? "Gagal menghapus."); return; }
    setDelSub(null); load();
  }

  const subsOf = (catId: number) => subcategories.filter(s => s.categoryId === catId);

  return (
    <AdminLayout>
      <PageHeader
        title="Kategori & Subkategori"
        description="Struktur klasifikasi materi soal CPNS."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => openCreateSub()}
              className="flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm"
            >
              <Tag size={15} /> Tambah Subkategori
            </button>
            <button
              onClick={openCreateCat}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={15} /> Tambah Kategori
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border text-center gap-3">
          <Layers size={40} className="text-slate-300" />
          <p className="text-slate-500 font-medium">Belum ada kategori</p>
          <button onClick={openCreateCat} className="text-sm text-blue-600 font-semibold hover:underline">
            + Tambah kategori pertama
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-md tracking-wider">
                    {cat.code}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{cat.name}</div>
                    {cat.description && (
                      <div className="text-xs text-slate-400 mt-0.5">{cat.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCreateSub(cat.id)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                  >
                    <Plus size={13} /> Subkategori
                  </button>
                  <button
                    onClick={() => openEditCat(cat)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => setDelCat(cat.id)}
                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Subcategories */}
              {subsOf(cat.id).length === 0 ? (
                <div className="px-5 py-4 text-sm text-slate-400 italic">
                  Belum ada subkategori —{" "}
                  <button onClick={() => openCreateSub(cat.id)} className="text-blue-500 hover:underline not-italic font-medium">
                    tambah sekarang
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-slate-400 font-semibold border-b bg-white">
                      <th className="px-5 py-2.5 text-left">#</th>
                      <th className="px-5 py-2.5 text-left">Nama Subkategori</th>
                      <th className="px-5 py-2.5 text-left">Deskripsi</th>
                      <th className="px-5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subsOf(cat.id).map((sub, i) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{sub.name}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">
                          {sub.description || "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => openEditSub(sub)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDelSub(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Kategori ── */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-slate-900">
                {editCatId ? "Edit Kategori" : "Tambah Kategori"}
              </h2>
              <button onClick={() => setCatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveCat} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kode <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono tracking-wider"
                  placeholder="TWK / TIU / TKP"
                  value={catForm.code}
                  onChange={e => setCatForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tes Wawasan Kebangsaan"
                  value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Deskripsi singkat kategori..."
                  value={catForm.description}
                  onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setCatModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70">
                  {saving ? "Menyimpan..." : editCatId ? "Simpan Perubahan" : "Tambah Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Subkategori ── */}
      {subModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-slate-900">
                {editSubId ? "Edit Subkategori" : "Tambah Subkategori"}
              </h2>
              <button onClick={() => setSubModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveSub} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={subForm.categoryId}
                  onChange={e => setSubForm(f => ({ ...f, categoryId: e.target.value }))}
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Subkategori <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pancasila, UUD 1945, Numerik, ..."
                  value={subForm.name}
                  onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Deskripsi singkat subkategori..."
                  value={subForm.description}
                  onChange={e => setSubForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setSubModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70">
                  {saving ? "Menyimpan..." : editSubId ? "Simpan Perubahan" : "Tambah Subkategori"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm hapus kategori ── */}
      {delCat !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-400 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Hapus Kategori?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Semua subkategori di dalamnya juga akan ikut terhapus.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDelCat(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                Batal
              </button>
              <button onClick={() => deleteCat(delCat)}
                className="px-5 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm hapus subkategori ── */}
      {delSub !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-400 mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">Hapus Subkategori?</h3>
            <p className="text-sm text-slate-500 mb-5">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDelSub(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                Batal
              </button>
              <button onClick={() => deleteSub(delSub)}
                className="px-5 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
