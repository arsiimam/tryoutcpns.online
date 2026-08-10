import React, { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertCircle, ExternalLink,
  Filter, Download, X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Transaction {
  id: string;
  merchantOrderId: string;
  planId: string;
  planName: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  duitkuReference: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface Pagination { page: number; limit: number; total: number; }
interface Stats { status: string; count: number; total: number; }

type ToastState = { type: "success" | "error"; msg: string } | null;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const BLUE = "#1E4D9C";

function idr(n: number) { return `Rp ${n.toLocaleString("id-ID")}`; }

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    success:   { label: "Sukses",    bg: "#f0fdf4", text: "#15803d", icon: <CheckCircle2 size={12} /> },
    pending:   { label: "Menunggu", bg: "#fffbeb", text: "#92400e", icon: <Clock size={12} /> },
    failed:    { label: "Gagal",    bg: "#fef2f2", text: "#b91c1c", icon: <XCircle size={12} /> },
    expired:   { label: "Kadaluarsa", bg: "#f8fafc", text: "#64748b", icon: <XCircle size={12} /> },
    cancelled: { label: "Dibatalkan", bg: "#f8fafc", text: "#64748b", icon: <XCircle size={12} /> },
  };
  const s = map[status] ?? { label: status, bg: "#f8fafc", text: "#64748b", icon: null };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}>
      {s.icon}{s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
export function AdminPaymentsPage() {
  const [txs, setTxs]           = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0 });
  const [stats, setStats]       = useState<Stats[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch]     = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [detail, setDetail]     = useState<Transaction | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast]       = useState<ToastState>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(statusFilter && { status: statusFilter }),
        ...(search       && { search }),
      });
      const data = await fetch(`/api/admin/transactions?${params}`).then(r => r.json());
      setTxs(data.transactions ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  async function loadStats() {
    const data = await fetch("/api/admin/transactions/stats").then(r => r.json());
    setStats(data.stats ?? []);
  }

  useEffect(() => { load(1); loadStats(); }, [load]);

  /* manual status update */
  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/transactions/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      showToast("success", "Status transaksi berhasil diperbarui.");
      if (detail?.id === id) setDetail(d => d ? { ...d, status: newStatus } : null);
      await load(pagination.page);
      await loadStats();
    } catch {
      showToast("error", "Gagal memperbarui status.");
    } finally {
      setUpdatingId(null);
    }
  }

  /* stats totals */
  const totalRevenue = stats.filter(s => s.status === "success").reduce((a, s) => a + s.total, 0);
  const totalSuccess = stats.find(s => s.status === "success")?.count ?? 0;
  const totalPending = stats.find(s => s.status === "pending")?.count ?? 0;
  const totalFailed  = (stats.find(s => s.status === "failed")?.count ?? 0)
                     + (stats.find(s => s.status === "expired")?.count ?? 0);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  /* ---------------------------------------------------------------- */
  return (
    <AdminLayout>
      <PageHeader title="Riwayat Transaksi" description="Pantau semua transaksi pembayaran peserta." />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Pendapatan", value: idr(totalRevenue), sub: `${totalSuccess} transaksi sukses`, color: "#10b981" },
          { label: "Transaksi Sukses", value: String(totalSuccess), sub: "pembayaran berhasil", color: BLUE },
          { label: "Menunggu Bayar",   value: String(totalPending), sub: "belum selesai", color: "#f59e0b" },
          { label: "Gagal / Expired",  value: String(totalFailed),  sub: "tidak berhasil", color: "#ef4444" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border shadow-sm p-4">
            <div className="text-xs text-slate-500 mb-1">{c.label}</div>
            <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm mb-4 p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 flex-1 min-w-48">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            className="text-sm flex-1 outline-none bg-transparent"
            placeholder="Cari order ID, nama, email, paket..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); } }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); }} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setSearch(searchInput)}
          className="px-3 py-1.5 text-sm rounded-lg text-white font-medium transition-opacity hover:opacity-90"
          style={{ background: BLUE }}
        >
          Cari
        </button>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="success">Sukses</option>
            <option value="pending">Menunggu</option>
            <option value="failed">Gagal</option>
            <option value="expired">Kadaluarsa</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>

        <button onClick={() => load(pagination.page)} className="ml-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Memuat transaksi...
          </div>
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <AlertCircle size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Tidak ada transaksi ditemukan</p>
            {(statusFilter || search) && (
              <button onClick={() => { setStatusFilter(""); setSearch(""); setSearchInput(""); }}
                className="mt-2 text-sm underline" style={{ color: BLUE }}>
                Hapus filter
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Peserta</th>
                    <th className="px-4 py-3">Paket</th>
                    <th className="px-4 py-3">Jumlah</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600">{tx.merchantOrderId}</span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.userName ? (
                          <div>
                            <div className="font-medium text-slate-800">{tx.userName}</div>
                            <div className="text-xs text-slate-400">{tx.userEmail}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{tx.planName}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{idr(tx.amount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{tx.paymentMethod ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(tx.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetail(tx)}
                          className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 text-sm text-slate-500">
              <span>{pagination.total} transaksi · halaman {pagination.page} dari {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => load(pagination.page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  disabled={pagination.page >= totalPages}
                  onClick={() => load(pagination.page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---- Detail modal ---- */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: BLUE }}>
              <h3 className="font-bold text-white text-sm">Detail Transaksi</h3>
              <button onClick={() => setDetail(null)} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4 text-sm">
              {[
                { label: "Order ID",     value: detail.merchantOrderId, mono: true },
                { label: "Ref. Duitku",  value: detail.duitkuReference ?? "—", mono: true },
                { label: "Peserta",      value: detail.userName ?? "—" },
                { label: "Email",        value: detail.userEmail ?? "—" },
                { label: "Paket",        value: detail.planName },
                { label: "Jumlah",       value: idr(detail.amount) },
                { label: "Metode",       value: detail.paymentMethod ?? "—" },
                { label: "Dibuat",       value: fmtDate(detail.createdAt) },
                { label: "Kadaluarsa",   value: fmtDate(detail.expiresAt) },
              ].map(r => (
                <div key={r.label} className="flex justify-between gap-4">
                  <span className="text-slate-500 shrink-0">{r.label}</span>
                  <span className={`font-medium text-right break-all ${r.mono ? "font-mono text-xs" : ""}`}>{r.value}</span>
                </div>
              ))}

              {/* Status */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={detail.status} />
              </div>

              {/* Update status */}
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-400 mb-2 font-medium">Update Status Manual</p>
                <div className="flex flex-wrap gap-2">
                  {["success", "failed", "cancelled", "expired"].map(s => (
                    <button
                      key={s}
                      disabled={detail.status === s || updatingId === detail.id}
                      onClick={() => updateStatus(detail.id, s)}
                      className="px-3 py-1.5 text-xs rounded-lg border font-medium capitalize transition-all disabled:opacity-40"
                      style={detail.status === s
                        ? { background: BLUE, color: "#fff", borderColor: BLUE }
                        : { background: "#fff", color: "#475569", borderColor: "#e2e8f0" }}
                    >
                      {updatingId === detail.id ? <RefreshCw size={11} className="animate-spin inline" /> : null}
                      {" "}{s === "success" ? "Sukses" : s === "failed" ? "Gagal" : s === "cancelled" ? "Batal" : "Expired"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
