import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import {
  Eye, EyeOff, Copy, CheckCircle2, Save, RefreshCw,
  AlertCircle, Zap, Globe, Clock, ShieldCheck,
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
export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<ToastState>(null);

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

  const callbackUrlGoogle = `${window.location.origin}/api/auth/google/callback`;
  const callbackUrlDuitku = `${window.location.origin}/api/payment/callback`;

  /* ---- fetch settings ---- */
  async function loadSettings() {
    try {
      const data: SettingsData = await fetch("/api/admin/settings").then((r) => r.json());
      setSettings(data);
      setClientId(data.google_client_id);
      setMerchantCode(data.duitku_merchant_code);
      setDuitkuEnv(data.duitku_environment);
      setExpiryPeriod(data.duitku_expiry_period || "1440");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
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
