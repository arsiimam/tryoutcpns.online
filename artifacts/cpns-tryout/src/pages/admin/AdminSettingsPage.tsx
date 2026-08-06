import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Eye, EyeOff, Copy, CheckCircle2, Save, RefreshCw,
  AlertCircle, Zap, Globe, Clock, ShieldCheck, Target, ToggleLeft, ToggleRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface SettingsData {
  /* Google */
  google_client_id: string;
  google_client_secret_masked: string;
  google_client_secret_source: "database" | "environment" | "none";
  /* Duitku */
  duitku_merchant_code: string;
  duitku_api_key_masked: string;
  duitku_api_key_source: "database" | "environment" | "none";
  duitku_merchant_code_source: "database" | "environment" | "none";
  duitku_environment: "sandbox" | "production";
  duitku_expiry_period: string;
  /* Midtrans */
  midtrans_server_key_masked: string;
  midtrans_server_key_source: "database" | "environment" | "none";
  midtrans_client_key: string;
  midtrans_client_key_source: "database" | "environment" | "none";
  midtrans_environment: "sandbox" | "production";
  /* Gateway */
  active_payment_gateway: "duitku" | "midtrans";
}

type ToastState = { type: "success" | "error"; msg: string } | null;

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */
const BLUE = "#4f5eea";

function SourceBadge({ source }: { source: "database" | "environment" | "none" }) {
  if (source === "none") return null;
  return (
    <span
      className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
      style={
        source === "database"
          ? { background: "#dcfce7", color: "#15803d" }
          : { background: "#fef3c7", color: "#92400e" }
      }
    >
      {source === "database" ? "✓ Tersimpan di database" : "Dari environment variable"}
    </span>
  );
}

function MaskedField({ value }: { value: string }) {
  if (!value) return null;
  return (
    <div className="mb-2 px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-500 font-mono">
      {value}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors"
      style={copied
        ? { background: "#f0fdf4", borderColor: "#86efac", color: "#15803d" }
        : { background: "#fff",    borderColor: "#e2e8f0", color: "#475569" }}
    >
      {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-5 border-b bg-slate-50 flex items-center gap-3">
        {icon}
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

const CPNS_CATEGORIES = [
  { key: "TWK", label: "TWK", fullName: "Tes Wawasan Kebangsaan", defaultVal: 65 },
  { key: "TIU", label: "TIU", fullName: "Tes Intelegensi Umum",   defaultVal: 80 },
  { key: "TKP", label: "TKP", fullName: "Tes Karakteristik Pribadi", defaultVal: 166 },
];

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<ToastState>(null);

  /* Passing Grade state */
  const [pgGrades, setPgGrades]   = useState<Record<string, string>>({ TWK: "65", TIU: "80", TKP: "166" });
  const [pgLoading, setPgLoading] = useState(true);
  const [savingPg, setSavingPg]   = useState(false);

  /* Google state */
  const [clientId, setClientId]       = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showGSecret, setShowGSecret] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);

  /* Duitku state */
  const [merchantCode, setMerchantCode]   = useState("");
  const [apiKey, setApiKey]               = useState("");
  const [showApiKey, setShowApiKey]       = useState(false);
  const [duitkuEnv, setDuitkuEnv]         = useState<"sandbox" | "production">("sandbox");
  const [expiryPeriod, setExpiryPeriod]   = useState("1440");
  const [savingDuitku, setSavingDuitku]   = useState(false);

  /* Midtrans state */
  const [mtServerKey, setMtServerKey]   = useState("");
  const [mtClientKey, setMtClientKey]   = useState("");
  const [showMtServerKey, setShowMtServerKey] = useState(false);
  const [mtEnv, setMtEnv]               = useState<"sandbox" | "production">("sandbox");
  const [savingMidtrans, setSavingMidtrans] = useState(false);

  /* Active gateway state */
  const [activeGateway, setActiveGateway]   = useState<"duitku" | "midtrans">("duitku");
  const [savingGateway, setSavingGateway]   = useState(false);

  const callbackUrlGoogle  = `${window.location.origin}/api/auth/google/callback`;
  const callbackUrlDuitku  = `${window.location.origin}/api/payment/callback`;
  const callbackUrlMidtrans = `${window.location.origin}/api/payment/midtrans-notification`;

  /* ---- fetch settings ---- */
  async function loadSettings() {
    try {
      const data: SettingsData = await fetch("/api/admin/settings").then((r) => r.json());
      setSettings(data);
      setClientId(data.google_client_id);
      setMerchantCode(data.duitku_merchant_code);
      setDuitkuEnv(data.duitku_environment);
      setExpiryPeriod(data.duitku_expiry_period || "1440");
      setMtClientKey(data.midtrans_client_key ?? "");
      setMtEnv(data.midtrans_environment ?? "sandbox");
      setActiveGateway(data.active_payment_gateway ?? "duitku");
    } finally {
      setLoading(false);
    }
  }

  /* ---- fetch passing grades ---- */
  useEffect(() => {
    fetch("/api/admin/settings/passing-grades", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.grades) {
          setPgGrades(Object.fromEntries(
            Object.entries(d.grades as Record<string, number>).map(([k, v]) => [k, String(v)])
          ));
        }
      })
      .catch(() => {})
      .finally(() => setPgLoading(false));
  }, []);

  useEffect(() => { loadSettings(); }, []);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  /* ---- save Passing Grade ---- */
  async function handleSavePg(e: React.FormEvent) {
    e.preventDefault();
    setSavingPg(true);
    try {
      const grades: Record<string, number> = {};
      for (const [k, v] of Object.entries(pgGrades)) {
        const n = Number(v);
        if (!isNaN(n) && n >= 0) grades[k] = n;
      }
      const res = await fetch("/api/admin/settings/passing-grades", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan.");
      showToast("success", "Passing grade nasional berhasil disimpan.");
    } catch {
      showToast("error", "Gagal menyimpan passing grade. Coba lagi.");
    } finally {
      setSavingPg(false);
    }
  }

  /* ---- save Google ---- */
  async function handleSaveGoogle(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoogle(true);
    try {
      const body: Record<string, string> = { google_client_id: clientId };
      if (clientSecret.trim()) body.google_client_secret = clientSecret;

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gagal menyimpan.");

      await loadSettings();
      setClientSecret("");
      showToast("success", "Pengaturan Google OAuth berhasil disimpan.");
    } catch {
      showToast("error", "Gagal menyimpan pengaturan Google. Coba lagi.");
    } finally {
      setSavingGoogle(false);
    }
  }

  /* ---- save Gateway toggle ---- */
  async function handleSaveGateway(gw: "duitku" | "midtrans") {
    setSavingGateway(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_payment_gateway: gw }),
      });
      if (!res.ok) throw new Error("Gagal");
      setActiveGateway(gw);
      showToast("success", `Gateway aktif diubah ke ${gw === "midtrans" ? "Midtrans" : "Duitku"}.`);
    } catch {
      showToast("error", "Gagal mengubah gateway aktif.");
    } finally {
      setSavingGateway(false);
    }
  }

  /* ---- save Midtrans ---- */
  async function handleSaveMidtrans(e: React.FormEvent) {
    e.preventDefault();
    setSavingMidtrans(true);
    try {
      const body: Record<string, string> = {
        midtrans_environment: mtEnv,
        midtrans_client_key:  mtClientKey,
      };
      if (mtServerKey.trim()) body.midtrans_server_key = mtServerKey;

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gagal menyimpan.");

      await loadSettings();
      setMtServerKey("");
      showToast("success", "Pengaturan Midtrans berhasil disimpan.");
    } catch {
      showToast("error", "Gagal menyimpan pengaturan Midtrans. Coba lagi.");
    } finally {
      setSavingMidtrans(false);
    }
  }

  /* ---- save Duitku ---- */
  async function handleSaveDuitku(e: React.FormEvent) {
    e.preventDefault();
    setSavingDuitku(true);
    try {
      const body: Record<string, string> = {
        duitku_merchant_code: merchantCode,
        duitku_environment:   duitkuEnv,
        duitku_expiry_period: expiryPeriod,
      };
      if (apiKey.trim()) body.duitku_api_key = apiKey;

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gagal menyimpan.");

      await loadSettings();
      setApiKey("");
      showToast("success", "Pengaturan Duitku berhasil disimpan.");
    } catch {
      showToast("error", "Gagal menyimpan pengaturan Duitku. Coba lagi.");
    } finally {
      setSavingDuitku(false);
    }
  }

  /* ---- loading skeleton ---- */
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-48 text-slate-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Memuat pengaturan...
        </div>
      </AdminLayout>
    );
  }

  /* ---- shared input style ---- */
  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono transition-shadow";

  return (
    <AdminLayout>
      <PageHeader title="Pengaturan Aplikasi" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
            ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl space-y-8">

        {/* ========== PASSING GRADE NASIONAL ========== */}
        <SectionCard
          icon={<Target size={22} className="text-emerald-600" />}
          title="Passing Grade Nasional SKD CPNS"
          subtitle="Nilai minimum per sub-tes yang menjadi acuan lulus/tidak lulus tryout"
        >
          {pgLoading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-slate-400">
              <RefreshCw size={15} className="animate-spin" /> Memuat...
            </div>
          ) : (
            <form onSubmit={handleSavePg} className="p-6 space-y-5">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                <p className="font-semibold mb-1">ℹ️ Informasi</p>
                <p>Nilai ini digunakan sebagai acuan passing grade di halaman Review Tryout dan otomatis dipakai saat import soal. Nilai default sesuai standar SKD CPNS nasional.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CPNS_CATEGORIES.map(cat => (
                  <div key={cat.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {cat.label}
                      <span className="block text-xs font-normal text-slate-400 mt-0.5">{cat.fullName}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={999}
                        required
                        value={pgGrades[cat.key] ?? String(cat.defaultVal)}
                        onChange={e => setPgGrades(prev => ({ ...prev, [cat.key]: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center text-lg font-bold"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center">Default: {cat.defaultVal}</p>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPgGrades({ TWK: "65", TIU: "80", TKP: "166" })}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Reset ke default
                </button>
                <button
                  type="submit"
                  disabled={savingPg}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {savingPg ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  {savingPg ? "Menyimpan..." : "Simpan Passing Grade"}
                </button>
              </div>
            </form>
          )}
        </SectionCard>

        {/* ========== GATEWAY AKTIF ========== */}
        <SectionCard
          icon={<ToggleRight size={22} className="text-indigo-600" />}
          title="Gateway Pembayaran Aktif"
          subtitle="Pilih gateway yang digunakan untuk menerima pembayaran dari user"
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(["duitku", "midtrans"] as const).map(gw => {
                const isActive = activeGateway === gw;
                return (
                  <button
                    key={gw}
                    type="button"
                    disabled={savingGateway}
                    onClick={() => handleSaveGateway(gw)}
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all font-medium text-sm ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2 right-2 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        AKTIF
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg ${
                      gw === "duitku" ? "bg-blue-500" : "bg-blue-700"
                    }`}>
                      {gw === "duitku" ? "D" : "M"}
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{gw === "duitku" ? "Duitku" : "Midtrans"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {gw === "duitku" ? "Pilih metode manual" : "Snap — all-in-one checkout"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              Hanya satu gateway yang aktif sekaligus. Klik untuk langsung menggantinya.
              Pastikan gateway yang dipilih sudah dikonfigurasi di bawah.
            </p>
          </div>
        </SectionCard>

        {/* ========== DUITKU PAYMENT GATEWAY ========== */}
        <SectionCard
          icon={
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black"
              style={{ background: BLUE }}>
              D
            </div>
          }
          title="Duitku Payment Gateway"
          subtitle="Konfigurasi Merchant Code, API Key, dan lingkungan pembayaran"
        >
          <form onSubmit={handleSaveDuitku} className="p-6 space-y-6">

            {/* Status bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={
                settings?.duitku_merchant_code && settings?.duitku_api_key_masked
                  ? { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }
                  : { background: "#fefce8", border: "1px solid #fde68a", color: "#92400e" }
              }
            >
              <ShieldCheck size={16} />
              {settings?.duitku_merchant_code && settings?.duitku_api_key_masked
                ? `Gateway aktif — mode ${settings.duitku_environment === "production" ? "Produksi 🟢" : "Sandbox 🟡"}`
                : "Gateway belum dikonfigurasi. Isi Merchant Code dan API Key di bawah."}
            </div>

            {/* Environment toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Globe size={14} className="inline mr-1.5 -mt-0.5" />
                Lingkungan (Environment)
              </label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
                {(["sandbox", "production"] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setDuitkuEnv(env)}
                    className="px-5 py-2 text-sm font-semibold transition-colors capitalize"
                    style={
                      duitkuEnv === env
                        ? { background: BLUE, color: "#fff" }
                        : { background: "#fff", color: "#475569" }
                    }
                  >
                    {env === "sandbox" ? "🟡 Sandbox" : "🟢 Production"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Gunakan Sandbox untuk pengujian. Ganti ke Production saat siap menerima pembayaran nyata.
              </p>
            </div>

            {/* Merchant Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Merchant Code
                <SourceBadge source={settings?.duitku_merchant_code_source ?? "none"} />
              </label>
              <input
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                placeholder="Contoh: DS12345"
                className={inputCls}
                style={{ focusRingColor: BLUE } as React.CSSProperties}
              />
              <p className="mt-1 text-xs text-slate-400">
                Kode merchant dari dashboard Duitku Anda.
              </p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                API Key
                <SourceBadge source={settings?.duitku_api_key_source ?? "none"} />
              </label>

              <MaskedField value={!apiKey ? (settings?.duitku_api_key_masked ?? "") : ""} />

              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    settings?.duitku_api_key_source !== "none"
                      ? "Biarkan kosong untuk tidak mengubah"
                      : "Masukkan Duitku API Key Anda"
                  }
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {settings?.duitku_api_key_source !== "none" && (
                <p className="mt-1 text-xs text-slate-400">
                  Kosongkan jika tidak ingin mengubah API Key yang sudah tersimpan.
                </p>
              )}
            </div>

            {/* Expiry Period */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Clock size={14} className="inline mr-1.5 -mt-0.5" />
                Masa Berlaku Invoice (menit)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={10080}
                  value={expiryPeriod}
                  onChange={(e) => setExpiryPeriod(e.target.value)}
                  className="w-36 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                />
                <div className="flex gap-2">
                  {[{ label: "1 Jam", val: "60" }, { label: "24 Jam", val: "1440" }, { label: "7 Hari", val: "10080" }].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setExpiryPeriod(opt.val)}
                      className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                      style={
                        expiryPeriod === opt.val
                          ? { background: "#eef1ff", borderColor: BLUE, color: BLUE, fontWeight: 600 }
                          : { background: "#fff", borderColor: "#e2e8f0", color: "#475569" }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Batas waktu maksimal 10.080 menit (7 hari). Default: 1440 menit (24 jam).
              </p>
            </div>

            {/* Callback URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Callback URL (Payment Notification)
                <span className="ml-2 text-xs font-normal text-slate-400">(daftarkan di dashboard Duitku)</span>
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={callbackUrlDuitku}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-600 font-mono cursor-default"
                />
                <CopyButton value={callbackUrlDuitku} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Masukkan URL ini di <strong>Dashboard Duitku → Project → Callback URL</strong>.
                Duitku akan mengirim notifikasi pembayaran ke URL ini.
              </p>
            </div>

            {/* Setup guide */}
            <div className="p-4 rounded-lg text-xs space-y-1.5"
              style={{ background: "#eef1ff", border: "1px solid #c7d2fe", color: "#3730a3" }}>
              <p className="font-semibold flex items-center gap-1.5">
                <Zap size={13} /> Cara mendapatkan kredensial Duitku:
              </p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Login ke <a href="https://merchant.duitku.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">merchant.duitku.com</a></li>
                <li>Buka menu <strong>Project</strong> → pilih atau buat project</li>
                <li>Salin <strong>Merchant Code</strong> dan <strong>API Key</strong> dari halaman Project</li>
                <li>Di bagian <strong>Callback URL</strong>, masukkan URL di atas</li>
                <li>Gunakan mode <strong>Sandbox</strong> untuk testing, ganti ke <strong>Production</strong> saat go-live</li>
              </ol>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={savingDuitku}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg transition-opacity disabled:opacity-60"
                style={{ background: BLUE }}
              >
                {savingDuitku ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                {savingDuitku ? "Menyimpan..." : "Simpan Pengaturan Duitku"}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* ========== MIDTRANS PAYMENT GATEWAY ========== */}
        <SectionCard
          icon={
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black"
              style={{ background: "#003f8a" }}>
              M
            </div>
          }
          title="Midtrans Payment Gateway"
          subtitle="Konfigurasi Server Key, Client Key, dan lingkungan Midtrans Snap"
        >
          <form onSubmit={handleSaveMidtrans} className="p-6 space-y-6">

            {/* Status bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
              style={
                settings?.midtrans_server_key_source !== "none" && settings?.midtrans_client_key
                  ? { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }
                  : { background: "#fefce8", border: "1px solid #fde68a", color: "#92400e" }
              }
            >
              <ShieldCheck size={16} />
              {settings?.midtrans_server_key_source !== "none" && settings?.midtrans_client_key
                ? `Gateway terkonfigurasi — mode ${settings.midtrans_environment === "production" ? "Produksi 🟢" : "Sandbox 🟡"}`
                : "Gateway belum dikonfigurasi. Isi Server Key dan Client Key di bawah."}
            </div>

            {/* Environment toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Globe size={14} className="inline mr-1.5 -mt-0.5" />
                Lingkungan (Environment)
              </label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
                {(["sandbox", "production"] as const).map((env) => (
                  <button key={env} type="button" onClick={() => setMtEnv(env)}
                    className="px-5 py-2 text-sm font-semibold transition-colors capitalize"
                    style={mtEnv === env ? { background: "#003f8a", color: "#fff" } : { background: "#fff", color: "#475569" }}
                  >
                    {env === "sandbox" ? "🟡 Sandbox" : "🟢 Production"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Gunakan Sandbox untuk pengujian. Ganti ke Production saat siap menerima pembayaran nyata.
              </p>
            </div>

            {/* Server Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Server Key
                <SourceBadge source={settings?.midtrans_server_key_source ?? "none"} />
              </label>
              <MaskedField value={!mtServerKey ? (settings?.midtrans_server_key_masked ?? "") : ""} />
              <div className="relative">
                <input
                  type={showMtServerKey ? "text" : "password"}
                  value={mtServerKey}
                  onChange={(e) => setMtServerKey(e.target.value)}
                  placeholder={settings?.midtrans_server_key_source !== "none" ? "Biarkan kosong untuk tidak mengubah" : "SB-Mid-server-..."}
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowMtServerKey(!showMtServerKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showMtServerKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {settings?.midtrans_server_key_source !== "none" && (
                <p className="mt-1 text-xs text-slate-400">Kosongkan jika tidak ingin mengubah Server Key yang sudah tersimpan.</p>
              )}
            </div>

            {/* Client Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Key (public)
                <SourceBadge source={settings?.midtrans_client_key_source ?? "none"} />
              </label>
              <input
                type="text"
                value={mtClientKey}
                onChange={(e) => setMtClientKey(e.target.value)}
                placeholder="SB-Mid-client-..."
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">Client Key bersifat public dan digunakan di frontend untuk Snap.js.</p>
            </div>

            {/* Notification URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notification URL
                <span className="ml-2 text-xs font-normal text-slate-400">(daftarkan di dashboard Midtrans)</span>
              </label>
              <div className="flex gap-2">
                <input readOnly value={callbackUrlMidtrans}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-600 font-mono cursor-default" />
                <CopyButton value={callbackUrlMidtrans} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Masukkan URL ini di <strong>Midtrans Dashboard → Settings → Configuration → Payment Notification URL</strong>.
              </p>
            </div>

            {/* Setup guide */}
            <div className="p-4 rounded-lg text-xs space-y-1.5"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a" }}>
              <p className="font-semibold flex items-center gap-1.5">
                <Zap size={13} /> Cara mendapatkan kredensial Midtrans:
              </p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Login ke <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">dashboard.midtrans.com</a></li>
                <li>Pilih environment <strong>Sandbox</strong> atau <strong>Production</strong></li>
                <li>Buka <strong>Settings → Access Keys</strong></li>
                <li>Salin <strong>Server Key</strong> dan <strong>Client Key</strong></li>
                <li>Di <strong>Settings → Configuration</strong>, isi <strong>Payment Notification URL</strong> dengan URL di atas</li>
              </ol>
            </div>

            <div className="pt-1 flex justify-end">
              <button type="submit" disabled={savingMidtrans}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg transition-opacity disabled:opacity-60"
                style={{ background: "#003f8a" }}
              >
                {savingMidtrans ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                {savingMidtrans ? "Menyimpan..." : "Simpan Pengaturan Midtrans"}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* ========== GOOGLE OAUTH ========== */}
        <SectionCard
          icon={
            <svg viewBox="0 0 24 24" className="w-8 h-8">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          }
          title="Google OAuth 2.0"
          subtitle="Konfigurasi login dengan Google"
        >
          <form onSubmit={handleSaveGoogle} className="p-6 space-y-5">
            {/* Callback URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Authorized Redirect URI
                <span className="ml-2 text-xs font-normal text-slate-400">(salin ke Google Cloud Console)</span>
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={callbackUrlGoogle}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-600 font-mono cursor-default"
                />
                <CopyButton value={callbackUrlGoogle} />
              </div>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className={inputCls}
              />
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Secret
                <SourceBadge source={settings?.google_client_secret_source ?? "none"} />
              </label>
              <MaskedField value={!clientSecret ? (settings?.google_client_secret_masked ?? "") : ""} />
              <div className="relative">
                <input
                  type={showGSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={
                    settings?.google_client_secret_source !== "none"
                      ? "Biarkan kosong untuk tidak mengubah"
                      : "GOCSPX-..."
                  }
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowGSecret(!showGSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showGSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Guide */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Cara mendapatkan kredensial Google:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Buka <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console → Credentials</a></li>
                <li>Klik <strong>Create Credentials → OAuth 2.0 Client ID</strong></li>
                <li>Pilih <strong>Web application</strong></li>
                <li>Di bagian <em>Authorized redirect URIs</em>, tambahkan URL di atas</li>
                <li>Salin Client ID dan Client Secret ke form ini</li>
              </ol>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={savingGoogle}
                className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-lg transition-opacity disabled:opacity-60"
                style={{ background: BLUE }}
              >
                {savingGoogle ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                {savingGoogle ? "Menyimpan..." : "Simpan Pengaturan Google"}
              </button>
            </div>
          </form>
        </SectionCard>

      </div>
    </AdminLayout>
  );
}
