import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, Tag } from "lucide-react";

interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchase: number;
  maxDiscount: number;
  quota: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  minPurchase: "0",
  maxDiscount: "0",
  quota: "100",
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: "",
  isActive: true,
};

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  async function loadCoupons() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/coupons", { credentials: "include" });
      if (!r.ok) throw new Error();
      const data: Coupon[] = await r.json();
      setCoupons(data);
    } catch {
      setError("Gagal memuat data kupon.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCoupons(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(c: Coupon) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? "",
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minPurchase: String(c.minPurchase),
      maxDiscount: String(c.maxDiscount),
      quota: String(c.quota),
      validFrom: c.validFrom.slice(0, 10),
      validUntil: c.validUntil.slice(0, 10),
      isActive: c.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...form,
      discountValue: Number(form.discountValue),
      minPurchase: Number(form.minPurchase),
      maxDiscount: Number(form.maxDiscount),
      quota: Number(form.quota),
    };
    try {
      const url = editingId
        ? `/api/admin/coupons/${editingId}`
        : "/api/admin/coupons";
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Gagal menyimpan."); return; }
      setModalOpen(false);
      await loadCoupons();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: number) {
    try {
      const r = await fetch(`/api/admin/coupons/${id}/toggle`, {
        method: "PUT", credentials: "include",
      });
      if (!r.ok) return;
      const updated: Coupon = await r.json();
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
    } catch {}
  }

  async function handleDelete(id: number) {
    try {
      const r = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!r.ok) return;
      setDeleteConfirm(null);
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch {}
  }

  const fmt = (n: number) => n.toLocaleString("id-ID");

  return (
    <AdminLayout>
      <PageHeader
        title="Kupon Promo"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} /> Buat Kupon
          </button>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border text-center">
          <Tag size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada kupon</p>
          <p className="text-slate-400 text-sm mt-1">Klik "Buat Kupon" untuk menambahkan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Diskon</th>
                <th className="px-4 py-3">Min. Pembelian</th>
                <th className="px-4 py-3">Kuota</th>
                <th className="px-4 py-3">Berlaku Sampai</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900 font-mono tracking-wider">{c.code}</span>
                    {c.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">
                    {c.discountType === "percentage"
                      ? `${c.discountValue}%`
                      : `Rp ${fmt(c.discountValue)}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.minPurchase > 0 ? `Rp ${fmt(c.minPurchase)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className={c.usedCount >= c.quota ? "text-red-500 font-medium" : ""}>
                      {c.usedCount}
                    </span>
                    <span className="text-slate-400"> / {c.quota}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(c.validUntil).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.isActive ? "active" : "inactive"} />
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end items-center gap-1">
                    <button
                      onClick={() => handleToggle(c.id)}
                      title={c.isActive ? "Nonaktifkan" : "Aktifkan"}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                    >
                      {c.isActive
                        ? <ToggleRight size={18} className="text-emerald-500" />
                        : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Form ─────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingId ? "Edit Kupon" : "Buat Kupon Baru"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Kode Kupon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. HEMAT50"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  placeholder="Keterangan kupon (opsional)"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Tipe Diskon <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.discountType}
                    onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nilai Diskon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                      {form.discountType === "percentage" ? "%" : "Rp"}
                    </span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={form.discountType === "percentage" ? 100 : undefined}
                      value={form.discountValue}
                      onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                      className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Min. Pembelian (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minPurchase}
                    onChange={e => setForm(f => ({ ...f, minPurchase: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Maks. Diskon (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0 = tidak terbatas"
                    value={form.maxDiscount}
                    onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Kuota Penggunaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.quota}
                  onChange={e => setForm(f => ({ ...f, quota: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Berlaku Dari</label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Berlaku Sampai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.validUntil}
                    onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {form.isActive ? "Kupon Aktif" : "Kupon Nonaktif"}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Buat Kupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Hapus Kupon?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Kupon <span className="font-mono font-bold">
                {coupons.find(c => c.id === deleteConfirm)?.code}
              </span> akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
