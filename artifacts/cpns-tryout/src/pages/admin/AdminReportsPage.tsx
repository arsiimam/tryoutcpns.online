import React from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AdminReportsPage() {
  const chartData = [
    { month: 'Jan', revenue: 2000000, users: 120 },
    { month: 'Feb', revenue: 3500000, users: 250 },
    { month: 'Mar', revenue: 10000000, users: 500 },
    { month: 'Apr', revenue: 8000000, users: 400 },
  ];

  return (
    <AdminLayout>
      <PageHeader title="Laporan & Statistik" description="Analisis performa platform secara keseluruhan." />
      
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Tren Pendapatan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={v => `${v/1000000}M`} />
                <Tooltip formatter={(v: number) => `Rp ${v.toLocaleString('id-ID')}`} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pertumbuhan Pengguna Baru</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
