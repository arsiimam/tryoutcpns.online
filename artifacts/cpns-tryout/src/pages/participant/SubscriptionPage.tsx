import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
/* ── Real-API types ── */
interface ActiveSub {
  id: string; planId: string; planName: string;
  status: string; startedAt: string; expiresAt: string; daysLeft: number;
}
interface Plan {
  id: string; name: string; price: number; originalPrice: number;
  durationDays: number; benefits: string[]; colorTag: string;
}
interface Transaction {
  id: string; merchantOrderId: string; planId: string; planName: string;
  amount: number; status: string; paymentMethod: string | null; createdAt: string;
}
import { useAuth } from "../../lib/auth-context";
import {
  CheckCircle2,
  ShieldCheck,
  Loader2,
  CreditCard,
  Building2,
  Wallet,
  QrCode,
  Store,
  AlertTriangle,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

/* ───────── Types ───────── */
interface PaymentMethodInfo {
  code: string;
  name: string;
  group: "virtual_account" | "ewallet" | "qris" | "retail" | "card";
}

interface PaymentConfig {
  environment: "sandbox" | "production";
  methods: PaymentMethodInfo[];
  merchantConfigured: boolean;
}

interface CreatePaymentResult {
  merchantOrderId: string;
  paymentUrl: string;
  reference: string;
  vaNumber?: string;
  qrString?: string;
  amount: number;
  statusCode: string;
  statusMessage: string;
}

/* ───────── Helpers ───────── */
function groupIcon(group: PaymentMethodInfo["group"]) {
  switch (group) {
    case "card":          return <CreditCard size={16} />;
    case "virtual_account": return <Building2 size={16} />;
    case "ewallet":       return <Wallet size={16} />;
    case "qris":          return <QrCode size={16} />;
    case "retail":        return <Store size={16} />;
  }
}

const GROUP_LABELS: Record<PaymentMethodInfo["group"], string> = {
  card:           "Kartu Kredit / Debit",
  virtual_account:"Virtual Account",
  ewallet:        "E-Wallet",
  qris:           "QRIS",
  retail:         "Minimarket",
};

function groupMethods(methods: PaymentMethodInfo[]) {
  const groups = new Map<string, PaymentMethodInfo[]>();
  for (const m of methods) {
    if (!groups.has(m.group)) groups.set(m.group, []);
    groups.get(m.group)!.push(m);
  }
  return groups;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

/* ───────── Component ───────── */
export function SubscriptionPage() {
  const { user } = useAuth();
  const [location] = useLocation();

  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [payments, setPayments]   = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [configError, setConfigError]     = useState("");

  // Checkout state
  const [isCheckoutOpen,  setIsCheckoutOpen]  = useState(false);
  const [selectedPlan,    setSelectedPlan]    = useState<Subscription | null>(null);
  const [selectedMethod,  setSelectedMethod]  = useState("");
  const [couponCode,      setCouponCode]      = useState("");
  const [discount,        setDiscount]        = useState(0);
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [checkoutError,   setCheckoutError]   = useState("");

  // Return-from-payment state
  const [returnStatus, setReturnStatus] = useState<"success" | "pending" | null>(null);
  const [returnOrderId, setReturnOrderId] = useState("");
  const [verifying, setVerifying]         = useState(false);
  const [verifyResult, setVerifyResult]   = useState<{ statusCode: string; statusMessage: string } | null>(null);

  /* Load data from real APIs */
  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [subRes, plansRes, txRes] = await Promise.all([
          fetch("/api/participant/subscription", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/plans").then((r) => r.json()),
          fetch("/api/participant/transactions", { credentials: "include" }).then((r) => r.json()),
        ]);
        setActiveSub(subRes.subscription ?? null);
        setPlans(plansRes.plans ?? []);
        setPayments(txRes.transactions ?? []);
      } catch {
        /* silent — states stay empty */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  /* Load payment config from API server */
  useEffect(() => {
    fetch("/api/payment/config")
      .then((r) => r.json())
      .then((cfg: PaymentConfig) => setPaymentConfig(cfg))
      .catch(() => setConfigError("Gagal memuat konfigurasi pembayaran. Pastikan API server berjalan."));
  }, []);

  /* Handle return from Duitku payment page */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status  = params.get("status");
    const orderId = params.get("orderId");
    if (status === "success" && orderId) {
      setReturnStatus("success");
      setReturnOrderId(orderId);
      // Verify via API
      setVerifying(true);
      fetch(`/api/payment/check/${orderId}`)
        .then((r) => r.json())
        .then((data) => {
          setVerifyResult({ statusCode: data.statusCode, statusMessage: data.statusMessage });
        })
        .catch(() => {
          setVerifyResult({ statusCode: "??", statusMessage: "Tidak dapat memverifikasi status" });
        })
        .finally(() => setVerifying(false));
    }
  }, [location]);

  const [couponId, setCouponId]       = useState<number | null>(null);
  const [couponMsg, setCouponMsg]     = useState<string>("");
  const [couponLoading, setCouponLoading] = useState(false);

  /* Apply coupon — validates against backend */
  const handleApplyCoupon = async () => {
    if (!selectedPlan || !couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg("");
    setDiscount(0);
    setCouponId(null);
    try {
      const res = await fetch("/api/payment/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), amount: selectedPlan.price }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponMsg(data.error ?? "Kupon tidak valid.");
      } else {
        setDiscount(data.discount);
        setCouponId(data.couponId);
        setCouponMsg("");
      }
    } catch {
      setCouponMsg("Gagal memvalidasi kupon. Coba lagi.");
    } finally {
      setCouponLoading(false);
    }
  };

  /* Checkout — create Duitku invoice then redirect */
  const handleCheckout = async () => {
    if (!selectedPlan || !selectedMethod || !user) return;
    if (!paymentConfig?.merchantConfigured) {
      setCheckoutError("Konfigurasi payment belum lengkap. Hubungi admin.");
      return;
    }
    setIsProcessing(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId:         selectedPlan.id,
          planName:       selectedPlan.name,
          amount:         selectedPlan.price,
          paymentMethod:  selectedMethod,
          customerName:   user.name,
          email:          user.email,
          discountAmount: discount,
          couponCode:     couponCode.trim() || undefined,
          couponId:       couponId ?? undefined,
        }),
      });

      const data = (await res.json()) as CreatePaymentResult & { error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal membuat invoice");
      }

      // Redirect to Duitku payment page
      window.location.href = data.paymentUrl;
    } catch (err: unknown) {
      setIsProcessing(false);
      setCheckoutError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const openCheckout = (plan: Plan) => {
    setSelectedPlan(plan);
    setSelectedMethod("");
    setCouponCode("");
    setDiscount(0);
    setCouponId(null);
    setCouponMsg("");
    setCheckoutError("");
    setIsCheckoutOpen(true);
  };

  const finalAmount = selectedPlan ? Math.max(10000, selectedPlan.price - discount) : 0;
  const grouped     = paymentConfig ? groupMethods(paymentConfig.methods) : new Map();

  /* ── Loading ── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
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

      {/* ── Return-from-payment banner ── */}
      {returnStatus === "success" && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Pembayaran Diproses</p>
            <p className="text-sm text-emerald-700">
              Order ID: <span className="font-mono">{returnOrderId}</span>
            </p>
            {verifying && (
              <p className="mt-1 flex items-center gap-1 text-sm text-emerald-600">
                <Loader2 size={12} className="animate-spin" /> Memeriksa status…
              </p>
            )}
            {verifyResult && (
              <p className="mt-1 text-sm text-emerald-700">
                Status:{" "}
                <strong>
                  {verifyResult.statusCode === "00"
                    ? "Berhasil"
                    : verifyResult.statusCode === "01"
                      ? "Menunggu Pembayaran"
                      : verifyResult.statusMessage}
                </strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Sandbox badge ── */}
      {paymentConfig?.environment === "sandbox" && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <AlertTriangle size={12} /> Mode Sandbox Duitku — bukan transaksi nyata
        </div>
      )}

      {/* Config error */}
      {configError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={14} /> {configError}
        </div>
      )}

      {/* ── Active subscription card ── */}
      {activeSub && (
        <div className="mb-10 flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-primary to-slate-800 p-6 text-white shadow-lg md:flex-row md:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <ShieldCheck size={32} className="text-amber-400" />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/80">Paket Aktif</div>
              <h2 className="text-3xl font-bold">{activeSub.planName}</h2>
            </div>
          </div>
          <div className="w-full rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm md:w-1/3">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-white/80">Sisa masa aktif</span>
              <span className="font-bold text-amber-400">{activeSub.daysLeft} Hari</span>
            </div>
            {(() => {
              const total = Math.max(1, Math.round(
                (new Date(activeSub.expiresAt).getTime() - new Date(activeSub.startedAt).getTime()) / 86400000
              ));
              const pct = Math.min(100, Math.round((activeSub.daysLeft / total) * 100));
              return (
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Pricing cards ── */}
      <div className="mb-12">
        <h3 className="mb-6 text-xl font-bold text-slate-900">Pilih Paket Belajar</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = activeSub?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border bg-white p-6 shadow-sm ${isCurrent ? "ring-2 ring-emerald-500" : ""}`}
              >
                {isCurrent && (
                  <div className="absolute right-4 top-0 -translate-y-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Paket Aktif
                  </div>
                )}
                <h4 className="mb-2 text-xl font-bold text-slate-900">{plan.name}</h4>
                <div className="mb-6">
                  {plan.originalPrice > plan.price && (
                    <div className="text-sm text-slate-400 line-through">Rp {fmt(plan.originalPrice)}</div>
                  )}
                  <div className="text-3xl font-black text-slate-900">
                    {plan.price === 0 ? "Gratis" : `Rp ${fmt(plan.price)}`}
                  </div>
                  {plan.price > 0 && <div className="text-sm text-slate-500">/{plan.durationDays} hari</div>}
                </div>
                <ul className="mb-6 flex-1 space-y-3 text-sm">
                  {plan.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent && plan.price > 0 && (
                  <button
                    onClick={() => openCheckout(plan)}
                    className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary/90"
                  >
                    Beli Paket
                  </button>
                )}
                {!isCurrent && plan.price === 0 && (
                  <button disabled className="w-full rounded-lg bg-slate-100 py-3 font-semibold text-slate-400">
                    Paket Dasar
                  </button>
                )}
                {isCurrent && plan.price > 0 && (
                  <button
                    onClick={() => openCheckout(plan)}
                    className="w-full rounded-lg bg-amber-100 py-3 font-semibold text-amber-800 transition-colors hover:bg-amber-200"
                  >
                    Perpanjang Masa Aktif
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Payment history ── */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-slate-900">Riwayat Pembayaran</h3>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                {["Invoice", "Tanggal", "Paket", "Jumlah", "Metode", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Belum ada riwayat pembayaran</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.merchantOrderId}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(p.createdAt).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.planName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">Rp {fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.paymentMethod ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      <Dialog.Root open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <Dialog.Title className="mb-1 text-xl font-bold text-slate-900">
              Checkout — {selectedPlan?.name}
            </Dialog.Title>
            <Dialog.Description className="mb-6 text-sm text-slate-500">
              Pilih metode pembayaran dan selesaikan transaksi melalui Duitku.
            </Dialog.Description>

            {/* Plan summary */}
            <div className="mb-5 rounded-xl border bg-slate-50 p-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Harga paket</span>
                <span>Rp {fmt(selectedPlan?.price ?? 0)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Diskon kupon</span>
                  <span>- Rp {fmt(discount)}</span>
                </div>
              )}
              <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold text-slate-900">
                <span>Total Bayar</span>
                <span>Rp {fmt(finalAmount)}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mb-5">
              <label className="mb-1 block text-sm font-medium text-slate-700">Kode Kupon (opsional)</label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setDiscount(0); setCouponId(null); setCouponMsg(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="Masukkan kode kupon"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1"
                >
                  {couponLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  Terapkan
                </button>
              </div>
              {couponMsg && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={11} /> {couponMsg}</p>
              )}
              {discount > 0 && (
                <p className="mt-1 text-xs text-emerald-600">✓ Kupon berhasil diterapkan! Diskon Rp {fmt(discount)}</p>
              )}
            </div>

            {/* Payment methods */}
            <div className="mb-5">
              <label className="mb-3 block text-sm font-medium text-slate-700">Metode Pembayaran</label>
              {paymentConfig && !paymentConfig.merchantConfigured ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle size={14} />
                  Konfigurasi Duitku belum lengkap. Hubungi admin.
                </div>
              ) : !paymentConfig ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" /> Memuat metode pembayaran…
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {Array.from(grouped.entries()).map(([group, methods]) => (
                    <div key={group}>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {groupIcon(group as PaymentMethodInfo["group"])}
                        {GROUP_LABELS[group as PaymentMethodInfo["group"]]}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {methods.map((m: PaymentMethodInfo) => (
                          <button
                            key={m.code}
                            onClick={() => setSelectedMethod(m.code)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                              selectedMethod === m.code
                                ? "border-primary bg-primary/5 font-semibold text-primary"
                                : "border-slate-200 text-slate-700 hover:border-primary/40"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              {groupIcon(m.group as PaymentMethodInfo["group"])}
                              {m.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {checkoutError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle size={14} /> {checkoutError}
              </div>
            )}

            {paymentConfig?.environment === "sandbox" && (
              <p className="mb-4 text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle size={11} /> Mode sandbox — tidak ada transaksi uang nyata
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 rounded-lg border py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleCheckout}
                disabled={!selectedMethod || isProcessing || !paymentConfig?.merchantConfigured}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Memproses…
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} /> Bayar Sekarang
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout>
  );
}
