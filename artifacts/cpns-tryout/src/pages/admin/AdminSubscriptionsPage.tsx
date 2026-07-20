import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Subscription } from "../../data/dummy-cpns-data";
import { CheckCircle2, Users } from "lucide-react";

export function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dummyApi.adminGetSubscriptions().then(data => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Paket Langganan" description="Kelola harga dan benefit untuk setiap paket premium." />

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <div className="flex items-center gap-1 text-sm font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">
                <Users size={14} /> 
                {plan.name === 'Gold' ? 300 : plan.name === 'Silver' ? 250 : 400}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-black">Rp {plan.price.toLocaleString('id-ID')}</div>
              <div className="text-sm text-slate-500">/{plan.duration} hari</div>
            </div>

            <ul className="space-y-2 mb-6 flex-1 text-sm">
              {plan.benefits.map((b, i) => (
                <li key={i} className="flex gap-2 text-slate-600">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-2 bg-slate-100 font-semibold rounded-lg hover:bg-slate-200 text-slate-700 transition-colors">
              Edit Paket
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
