import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Coupon } from "../../data/dummy-cpns-data";
import { Plus, Edit2, Trash2 } from "lucide-react";

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dummyApi.adminGetCoupons().then(data => {
      setCoupons(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader 
        title="Kupon Promo" 
        action={
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
            <Plus size={18} /> Buat Kupon
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Diskon</th>
              <th className="px-4 py-3">Kuota</th>
              <th className="px-4 py-3">Berlaku Sampai</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-slate-900">{c.code}</td>
                <td className="px-4 py-3 font-medium text-emerald-600">
                  {c.discountType === 'percentage' ? `${c.discountValue}%` : `Rp ${c.discountValue.toLocaleString('id-ID')}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.usedCount} / {c.quota}
                </td>
                <td className="px-4 py-3 text-slate-600">{new Date(c.validUntil).toLocaleDateString('id-ID')}</td>
                <td className="px-4 py-3"><StatusBadge status={c.isActive ? 'active' : 'inactive'} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"><Edit2 size={16} /></button>
                  <button className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
