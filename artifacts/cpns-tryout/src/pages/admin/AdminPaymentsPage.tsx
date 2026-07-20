import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Payment } from "../../data/dummy-cpns-data";
import { Filter } from "lucide-react";

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dummyApi.adminGetPayments().then(data => {
      setPayments(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Riwayat Pembayaran" />

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex gap-4 bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Filter size={18} /> Status:
          </div>
          <select className="border rounded-md px-3 py-1.5 text-sm bg-white">
            <option value="">Semua Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-slate-500 uppercase font-semibold border-b">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Metode</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{p.invoiceNo}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                <td className="px-4 py-3 text-slate-600">{p.method}</td>
                <td className="px-4 py-3 font-bold text-slate-900">Rp {p.amount.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
