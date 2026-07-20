import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { MetricCard, PageHeader, StatusBadge } from "../../components/ui/shared";
import { dummyApi, AdminReports } from "../../lib/dummy-api";
import { Payment } from "../../data/dummy-cpns-data";
import { Users, CreditCard, Activity, CheckCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function AdminDashboardPage() {
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [repData, payData] = await Promise.all([
        dummyApi.adminGetReports(),
        dummyApi.adminGetPayments()
      ]);
      setReports(repData);
      setPayments(payData.slice(0, 5)); // Last 5 payments
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !reports) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const pieData = [
    { name: 'Gratis', value: 400 },
    { name: 'Silver', value: 300 },
    { name: 'Gold', value: 300 },
  ];
  const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b'];

  return (
    <AdminLayout>
      <PageHeader 
        title="Dashboard Overview" 
        description="Ringkasan performa platform SiapCPNS."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Pengguna" value="1,000" icon={Users} trend="12%" trendUp={true} />
        <MetricCard title="Pengguna Aktif" value="850" icon={Activity} trend="5%" trendUp={true} />
        <MetricCard title="Pendapatan Bulan Ini" value={`Rp ${(reports.totalRevenue / 1000000).toFixed(1)}M`} icon={CreditCard} trend="8%" trendUp={true} />
        <MetricCard title="Total Tryout Selesai" value="15,420" icon={CheckCircle} trend="20%" trendUp={true} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pendapatan per Bulan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pengguna Baru</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reports.newUsers}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800">Pembayaran Terbaru</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">{p.invoiceNo}</td>
                  <td className="px-6 py-4">Rp {p.amount.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4">{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribusi Paket</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-sm mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                <span className="text-slate-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
