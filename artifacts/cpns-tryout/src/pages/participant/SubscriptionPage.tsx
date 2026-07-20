import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
import { dummyApi, SubscriptionInfo } from "../../lib/dummy-api";
import { Subscription, Payment } from "../../data/dummy-cpns-data";
import { useAuth } from "../../lib/auth-context";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function SubscriptionPage() {
  const { user } = useAuth();
  const [activeSub, setActiveSub] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Subscription | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (user) {
        const [sub, allPlans, pays] = await Promise.all([
          dummyApi.getUserSubscription(user.id),
          dummyApi.getSubscriptions(),
          dummyApi.getPayments(user.id)
        ]);
        setActiveSub(sub);
        setPlans(allPlans);
        setPayments(pays);
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!selectedPlan || !couponCode) return;
    const res = await dummyApi.validateCoupon(couponCode, selectedPlan.id);
    if (res.valid) {
      setDiscount(res.discount);
      alert(res.message);
    } else {
      setDiscount(0);
      alert(res.message);
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    // simulate payment flow
    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutSuccess(true);
    }, 1500);
  };

  const openCheckout = (plan: Subscription) => {
    setSelectedPlan(plan);
    setCouponCode("");
    setDiscount(0);
    setCheckoutSuccess(false);
    setIsCheckoutOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title="Langganan Premium" 
        description="Kelola paket belajar Anda dan akses seluruh fitur SiapCPNS tanpa batas."
      />

      {activeSub && (
        <div className="bg-gradient-to-r from-primary to-slate-800 rounded-2xl p-6 md:p-8 text-white mb-10 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <ShieldCheck size={32} className="text-amber-400" />
            </div>
            <div>
              <div className="text-white/80 font-medium mb-1 uppercase tracking-wider text-xs">Paket Aktif Saat Ini</div>
              <h2 className="text-3xl font-bold">{activeSub.name}</h2>
            </div>
          </div>
          <div className="w-full md:w-1/3 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/80">Sisa masa aktif</span>
              <span className="font-bold text-amber-400">{activeSub.daysLeft} Hari</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
        </div>
      )}

      <div className="mb-12">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Pilih Paket Belajar</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = activeSub?.id === plan.id;
            return (
              <div key={plan.id} className={`
                relative flex flex-col p-6 rounded-xl border bg-white shadow-sm
                ${isCurrent ? 'ring-2 ring-emerald-500' : ''}
              `}>
                {isCurrent && (
                  <div className="absolute top-0 right-4 -translate-y-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">
                    Paket Aktif
                  </div>
                )}
                
                <h4 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h4>
                <div className="mb-6">
                  {plan.originalPrice > plan.price && (
                    <div className="text-sm line-through text-slate-400">Rp {plan.originalPrice.toLocaleString('id-ID')}</div>
                  )}
                  <div className="text-3xl font-black text-slate-900">Rp {plan.price.toLocaleString('id-ID')}</div>
                  <div className="text-sm text-slate-500">/{plan.duration} hari</div>
                </div>

                <ul className="flex-1 space-y-3 mb-6 text-sm">
                  {plan.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {!isCurrent && plan.price > 0 && (
                  <button 
                    onClick={() => openCheckout(plan)}
                    className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Beli Paket
                  </button>
                )}
                {!isCurrent && plan.price === 0 && (
                  <button disabled className="w-full py-3 bg-slate-100 text-slate-400 font-semibold rounded-lg">
                    Paket Dasar
                  </button>
                )}
                {isCurrent && plan.price > 0 && (
                  <button 
                    onClick={() => openCheckout(plan)}
                    className="w-full py-3 bg-amber-100 text-amber-800 font-semibold rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Perpanjang Masa Aktif
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Riwayat Pembayaran</h3>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">{p.invoiceNo}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4 text-slate-600">{p.method}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">Rp {p.amount.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Belum ada riwayat transaksi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog.Root open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-2xl shadow-2xl p-6 w-[90vw] max-w-lg z-50 animate-in zoom-in-95 duration-200">
            {checkoutSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <Dialog.Title className="text-2xl font-bold text-slate-900 mb-2">Pembayaran Berhasil!</Dialog.Title>
                <Dialog.Description className="text-slate-600 mb-8">
                  Paket {selectedPlan?.name} Anda telah aktif. Invoice telah dikirim ke email terdaftar.
                </Dialog.Description>
                <button 
                  onClick={() => { setIsCheckoutOpen(false); window.location.reload(); }}
                  className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <>
                <Dialog.Title className="text-xl font-bold text-slate-900 mb-6">Selesaikan Pembayaran</Dialog.Title>
                
                <div className="bg-slate-50 p-4 rounded-xl border mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-900">Paket {selectedPlan?.name}</span>
                    <span className="font-bold text-slate-900">Rp {selectedPlan?.price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-sm text-slate-500">Masa aktif: {selectedPlan?.duration} Hari</div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t text-emerald-600">
                      <span className="text-sm font-medium">Diskon Promo</span>
                      <span className="font-bold">- Rp {discount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className="font-bold text-slate-900">Total Bayar</span>
                    <span className="text-xl font-black text-primary">
                      Rp {((selectedPlan?.price || 0) - discount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Punya Kode Kupon?</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase text-sm"
                      placeholder="Masukkan kode promo"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Metode Pembayaran</label>
                  <select className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                    <option>BCA Virtual Account</option>
                    <option>Mandiri Virtual Account</option>
                    <option>QRIS</option>
                    <option>GoPay</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end">
                  <Dialog.Close asChild>
                    <button className="flex-1 py-3 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                      Batal
                    </button>
                  </Dialog.Close>
                  <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-lg font-bold text-white bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : "Bayar Sekarang"}
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </DashboardLayout>
  );
}
