import React, { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { Bell, Send, Users, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type FilterType = "all" | "free" | "premium" | "expiring";

interface Notification {
  id: string;
  title: string;
  body: string;
  filterType: FilterType;
  createdAt: string;
  recipientCount: number;
}

const FILTER_LABELS: Record<FilterType, string> = {
  all:      "Semua User",
  free:     "Pengguna Gratis",
  premium:  "Pengguna Premium",
  expiring: "Hampir Habis Paket (< 7 hari)",
};

const FILTER_COLORS: Record<FilterType, string> = {
  all:      "#1E4D9C",
  free:     "#64748b",
  premium:  "#b88a1a",
  expiring: "#dc2626",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    body: "",
    filterType: "all" as FilterType,
  });

  async function fetchNotifications() {
    try {
      const res = await fetch(`${BASE}/api/admin/notifications`, { credentials: "include" });
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNotifications(); }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${BASE}/api/admin/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim notifikasi");
      setSuccess(`Notifikasi berhasil dikirim ke ${data.recipientCount} pengguna.`);
      setForm({ title: "", body: "", filterType: "all" });
      fetchNotifications();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifikasi</h1>
          <p className="text-slate-500 text-sm mt-1">Kirim notifikasi in-app kepada pengguna berdasarkan status langganan.</p>
        </div>

        {/* Compose form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={18} style={{ color: "#1E4D9C" }} />
            <h2 className="font-semibold text-slate-800">Buat Notifikasi Baru</h2>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Filter target */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Penerima</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["all", "free", "premium", "expiring"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, filterType: f }))}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left"
                    style={{
                      background:   form.filterType === f ? FILTER_COLORS[f] : "#f8fafc",
                      color:        form.filterType === f ? "#fff" : "#475569",
                      borderColor:  form.filterType === f ? FILTER_COLORS[f] : "#e2e8f0",
                    }}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Judul Notifikasi</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Contoh: Promo Spesial Hari Kemerdekaan!"
                maxLength={120}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#1E4D9C" } as any}
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pesan</label>
              <textarea
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                placeholder="Tulis isi notifikasi di sini..."
                maxLength={500}
                required
                rows={4}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                style={{ "--tw-ring-color": "#1E4D9C" } as any}
              />
              <div className="text-right text-xs text-slate-400 mt-1">{form.body.length}/500</div>
            </div>

            {/* Feedback */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle size={15} /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <CheckCircle2 size={15} /> {success}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !form.title.trim() || !form.body.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "#1E4D9C" }}
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {sending ? "Mengirim..." : "Kirim Notifikasi"}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-800">Riwayat Notifikasi</h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Memuat...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Belum ada notifikasi yang dikirim.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div key={n.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 text-sm">{n.title}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: FILTER_COLORS[n.filterType] + "18",
                            color: FILTER_COLORS[n.filterType],
                          }}
                        >
                          {FILTER_LABELS[n.filterType] ?? n.filterType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{n.body}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 justify-end">
                        <Users size={13} className="text-slate-400" />
                        {n.recipientCount}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatDate(n.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
