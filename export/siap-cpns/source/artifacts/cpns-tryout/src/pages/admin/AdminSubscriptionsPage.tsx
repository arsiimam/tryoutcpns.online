import React, { useEffect, useState, useRef } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  Save, X, RefreshCw, AlertCircle, GripVertical, Star, Zap, Shield,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Plan {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  durationDays: number;
  benefits: string;      // JSON string
  maxTryouts: number;
  isActive: boolean;
  colorTag: string;
  sortOrder: number;
  createdAt: string;
}

type ToastState = { type: "success" | "error"; msg: string } | null;

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const BLUE = "#4f5eea";

const COLOR_OPTIONS = [
  { value: "slate",   label: "Abu-abu (Gratis)", preview: "#64748b" },
  { value: "blue",    label: "Biru (Silver)",    preview: "#4f5eea" },
  { value: "gold",    label: "Emas (Gold)",      preview: "#f59e0b" },
  { value: "emerald", label: "Hijau (Platinum)", preview: "#10b981" },
];

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  slate:   { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", badge: "#94a3b8" },
  blue:    { bg: "#eef1ff", text: "#3730a3", border: "#c7d2fe", badge: "#4f5eea" },
  gold:    { bg: "#fffbeb", text: "#92400e", border: "#fde68a", badge: "#f59e0b" },
  emerald: { bg: "#f0fdf4", text: "#065f46", border: "#bbf7d0", badge: "#10b981" },
};

function colorIcon(tag: string) {
  if (tag === "gold")    return <Star size={16} />;
  if (tag === "emerald") return <Shield size={16} />;
  if (tag === "blue")    return <Zap size={16} />;
  return null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function parseBenefits(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}
function idr(n: number) { return `Rp ${n.toLocaleString("id-ID")}`; }

/* ------------------------------------------------------------------ */
/* Blank form                                                          */
/* ------------------------------------------------------------------ */
function blankForm() {
  return {
    name: "",
    price: 0,
    originalPrice: 0,
    durationDays: 30,
    benefitsText: "",   // newline-separated
    maxTryouts: 999,
    isActive: true,
    colorTag: "blue",
    sortOrder: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
export function AdminSubscriptionsPage() {
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<ToastState>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [delId, setDelId]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(blankForm());

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/plans").then(r => r.json());
      setPlans(data.plans ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /* open create form */
  function openCreate() {
    setEditId(null);
    setForm(blankForm());
    setShowForm(true);
  }

  /* open edit form */
  function openEdit(p: Plan) {
    setEditId(p.id);
    setForm({
      name:          p.name,
      price:         p.price,
      originalPrice: p.originalPrice,
      durationDays:  p.durationDays,
      benefitsText:  parseBenefits(p.benefits).join("\n"),
      maxTryouts:    p.maxTryouts,
      isActive:      p.isActive,
      colorTag:      p.colorTag,
      sortOrder:     p.sortOrder,
    });
    setShowForm(true);
  }

  /* save (create or update) */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        price:         Number(form.price),
        originalPrice: Number(form.originalPrice),
        durationDays:  Number(form.durationDays),
        benefits:      form.benefitsText.split("\n").map(s => s.trim()).filter(Boolean),
        maxTryouts:    Number(form.maxTryouts),
        isActive:      form.isActive,
        colorTag:      form.colorTag,
        sortOrder:     Number(form.sortOrder),
      };

      const url    = editId ? `/api/admin/plans/${editId}` : "/api/admin/plans";
      const method = editId ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Gagal menyimpan paket.");

      showToast("success", editId ? "Paket berhasil diperbarui." : "Paket baru berhasil dibuat.");
      setShowForm(false);
      await load();
    } catch {
      showToast("error", "Gagal menyimpan paket. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  /* toggle active */
  async function toggleActive(p: Plan) {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  /* delete */
  async function confirmDelete() {
    if (!delId) return;
    await fetch(`/api/admin/plans/${delId}`, { method: "DELETE" });
    setDelId(null);
    showToast("success", "Paket berhasil dihapus.");
    await load();
  }

  /* ---- rendering helpers ---- */
  const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400";

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Paket Langganan" description="Kelola harga, durasi, dan benefit untuk setiap paket." />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: BLUE }}
        >
          <Plus size={16} /> Tambah Paket
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 mb-2">Hapus Paket?</h3>
            <p className="text-sm text-slate-500 mb-5">Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Memuat paket...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm flex flex-col items-center justify-center py-20 text-slate-400">
          <Shield size={40} className="mb-3 opacity-30" />
          <p className="font-medium">Belum ada paket langganan</p>
          <p className="text-sm mt-1">Klik "Tambah Paket" untuk membuat paket pertama.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((p) => {
            const cs = COLOR_STYLES[p.colorTag] ?? COLOR_STYLES.blue;
            const benefits = parseBenefits(p.benefits);
            return (
              <div key={p.id}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col"
                style={{ borderColor: p.isActive ? cs.border : "#e2e8f0" }}
              >
                {/* Header */}
                <div className="px-5 pt-5 pb-4" style={{ background: cs.bg }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ color: cs.badge }}>{colorIcon(p.colorTag)}</span>
                      <h3 className="font-bold text-lg" style={{ color: cs.text }}>{p.name}</h3>
                    </div>
                    <button
                      onClick={() => toggleActive(p)}
                      title={p.isActive ? "Nonaktifkan" : "Aktifkan"}
                      style={{ color: p.isActive ? cs.badge : "#cbd5e1" }}
                    >
                      {p.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </div>

                  <div className="flex items-baseline gap-2">
                    {p.price === 0 ? (
                      <span className="text-3xl font-black" style={{ color: cs.text }}>Gratis</span>
                    ) : (
                      <>
                        <span className="text-2xl font-black" style={{ color: cs.text }}>{idr(p.price)}</span>
                        {p.originalPrice > p.price && (
                          <span className="text-sm text-slate-400 line-through">{idr(p.originalPrice)}</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: cs.text, opacity: 0.65 }}>
                    {p.durationDays} hari · maks {p.maxTryouts === 999 ? "∞" : p.maxTryouts} tryout
                  </div>

                  {!p.isActive && (
                    <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Tidak Aktif
                    </span>
                  )}
                </div>

                {/* Benefits */}
                <ul className="px-5 py-4 space-y-2 flex-1 text-sm text-slate-600">
                  {benefits.length === 0 && (
                    <li className="text-slate-300 italic">Belum ada benefit</li>
                  )}
                  {benefits.map((b, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: cs.badge }} />
                      {b}
                    </li>
                  ))}
                </ul>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDelId(p.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Slide-in form panel ---- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Form header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ background: BLUE }}>
              <h2 className="font-bold text-white">{editId ? "Edit Paket" : "Tambah Paket Baru"}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Paket</label>
                <input required className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Silver, Gold, Platinum" />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Warna / Tier</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value} type="button"
                      onClick={() => setForm(f => ({ ...f, colorTag: c.value }))}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                      style={form.colorTag === c.value
                        ? { background: c.preview, color: "#fff", borderColor: c.preview }
                        : { background: "#fff", color: "#475569", borderColor: "#e2e8f0" }}
                    >
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: c.preview }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price + original price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harga (Rp)</label>
                  <input type="number" min={0} className={inputCls} value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">Isi 0 untuk paket gratis</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harga Coret (Rp)</label>
                  <input type="number" min={0} className={inputCls} value={form.originalPrice}
                    onChange={e => setForm(f => ({ ...f, originalPrice: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">Untuk tampilan diskon</p>
                </div>
              </div>

              {/* Duration + MaxTryouts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Durasi (hari)</label>
                  <input type="number" min={1} className={inputCls} value={form.durationDays}
                    onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maks. Tryout</label>
                  <input type="number" min={1} className={inputCls} value={form.maxTryouts}
                    onChange={e => setForm(f => ({ ...f, maxTryouts: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">999 = tidak terbatas</p>
                </div>
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urutan Tampilan</label>
                <input type="number" min={0} className={inputCls} value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
                <p className="text-xs text-slate-400 mt-1">Angka lebih kecil tampil lebih depan.</p>
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Benefit <span className="text-slate-400 font-normal">(satu per baris)</span></label>
                <textarea
                  rows={6}
                  className={inputCls}
                  value={form.benefitsText}
                  onChange={e => setForm(f => ({ ...f, benefitsText: e.target.value }))}
                  placeholder={"Akses Semua Tryout\nPembahasan Lengkap\nAnalisis Skor Detail"}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  style={{ color: form.isActive ? BLUE : "#cbd5e1" }}
                >
                  {form.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {form.isActive ? "Paket Aktif (tampil di halaman peserta)" : "Paket Nonaktif (disembunyikan)"}
                </span>
              </div>

              {/* Submit */}
              <div className="pt-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60"
                  style={{ background: BLUE }}>
                  {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? "Menyimpan..." : "Simpan Paket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
