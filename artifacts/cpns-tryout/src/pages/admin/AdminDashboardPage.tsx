import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { MetricCard, PageHeader, StatusBadge } from "../../components/ui/shared";
import { Users, CreditCard, Activity, CheckCircle, Loader2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ── Types ─────────────────────────────────────────────────────────── */
interface Stats {
  totals: {
    users: number;
    activeUsers: number;
    revenue: number;
    completedTryouts: number;
  };
  monthlyRevenue: { month: string; amount: number }[];
  newUsers: { month: string; count: number }[];
  recentPayments: {
    id: string;
    merchantOrderId: string;
    planName: string;
    amount: number;
    status: string;
    createdAt: string;
    userFullName: string | null;
    userEmail: string | null;
  }[];
  subsDistribution: { planName: string; count: number }[];
}

const PLAN_COLORS: Record<string, string> = {
  Gratis:   "#94a3b8",
  Silver:   "#3b82f6",
  Gold:     "#f59e0b",
  Platinum: "#10b981",
};
const FALLBACK_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f97316"];

function fmt(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ── Component ─────────────────────────────────────────────────────── */
export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data) => { setStats(data); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center text-red-500">
          Gagal memuat data: {error || "Tidak ada data"}
        </div>
      </AdminLayout>
    );
  }

  const { totals, monthlyRevenue, newUsers, recentPayments, subsDistribution } = stats;

  const pieData = subsDistribution.length > 0
    ? subsDistribution
    : [{ planName: "Belum ada data", count: 1 }];

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard Overview"
        description="Ringkasan performa platform SiapCPNS secara real-time."
      />

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Pengguna"
          value={totals.users.toLocaleString("id-ID")}
          icon={Users}
        />
        <MetricCard
          title="Langganan Aktif"
          value={totals.activeUsers.toLocaleString("id-ID")}
          icon={Activity}
        />
        <MetricCard
          title="Total Pendapatan"
          value={totals.revenue >= 1_000_000
            ? `Rp ${(totals.revenue / 1_000_000).toFixed(1)}M`
            : fmt(totals.revenue)}
          icon={CreditCard}
        />
        <MetricCard
          title="Tryout Selesai"
          value={totals.completedTryouts.toLocaleString("id-ID")}
          icon={CheckCircle}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pendapatan per Bulan</h3>
          {monthlyRevenue.every((m) => m.amount === 0) ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Belum ada transaksi berhasil
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1000}K`} />
                  <Tooltip formatter={(val: number) => fmt(val)} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pengguna Baru per Bulan</h3>
          {newUsers.every((m) => m.count === 0) ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Belum ada pengguna bulan ini
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newUsers}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Payments + Distribution ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800">Pembayaran Terbaru</h3>
          </div>
          {recentPayments.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Belum ada transaksi</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Pengguna</th>
                  <th className="px-6 py-4">Paket</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 truncate max-w-[140px]">{p.userFullName ?? "-"}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[140px]">{p.userEmail ?? "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{p.planName}</td>
                    <td className="px-6 py-4 font-medium">{fmt(p.amount)}</td>
                    <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribusi Paket Aktif</h3>
          {pieData[0].planName === "Belum ada data" ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Belum ada langganan aktif
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="planName"
                      cx="50%" cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={entry.planName}
                          fill={PLAN_COLORS[entry.planName] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number, name: string) => [`${val} pengguna`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {pieData.map((entry, i) => (
                  <div key={entry.planName} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: PLAN_COLORS[entry.planName] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                      />
                      <span className="text-slate-600">{entry.planName}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{entry.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
