import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { Eye, EyeOff, Copy, CheckCircle2, Save, RefreshCw, AlertCircle } from "lucide-react";

interface SettingsData {
  google_client_id: string;
  google_client_secret_masked: string;
  google_client_secret_source: "database" | "environment" | "none";
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const callbackUrl = `${window.location.origin}/api/auth/google/callback`;

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        setClientId(data.google_client_id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = { google_client_id: clientId };
      if (clientSecret.trim()) body.google_client_secret = clientSecret;

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Gagal menyimpan.");

      // Re-fetch to get updated masked value
      const updated = await fetch("/api/admin/settings").then((r) => r.json());
      setSettings(updated);
      setClientId(updated.google_client_id);
      setClientSecret("");
      showToast("success", "Pengaturan berhasil disimpan.");
    } catch {
      showToast("error", "Gagal menyimpan pengaturan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  function copyCallbackUrl() {
    navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    });
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-48 text-slate-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Memuat pengaturan...
        </div>
      </AdminLayout>
    );
  }

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

      <div className="max-w-2xl space-y-6">
        {/* Google OAuth Card */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b bg-slate-50 flex items-center gap-3">
            {/* Google logo */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div>
              <h2 className="font-semibold text-slate-800">Google OAuth 2.0</h2>
              <p className="text-xs text-slate-500 mt-0.5">Konfigurasi login dengan Google</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Callback URL — read only */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Authorized Redirect URI
                <span className="ml-2 text-xs font-normal text-slate-400">(salin ke Google Cloud Console)</span>
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={callbackUrl}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-600 font-mono cursor-default"
                />
                <button
                  type="button"
                  onClick={copyCallbackUrl}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors
                    ${copiedCallback ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {copiedCallback ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  {copiedCallback ? "Tersalin" : "Salin"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Tambahkan URL ini di Google Cloud Console → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs.
              </p>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Secret
                {settings?.google_client_secret_source !== "none" && (
                  <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded
                    ${settings?.google_client_secret_source === "database"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"}`}
                  >
                    {settings?.google_client_secret_source === "database" ? "✓ Tersimpan di database" : "Dari environment variable"}
                  </span>
                )}
              </label>

              {/* Show masked existing value if set */}
              {settings?.google_client_secret_masked && !clientSecret && (
                <div className="mb-2 px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-500 font-mono">
                  {settings.google_client_secret_masked}
                </div>
              )}

              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={settings?.google_client_secret_source !== "none" ? "Biarkan kosong untuk tidak mengubah" : "GOCSPX-..."}
                  className="w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {settings?.google_client_secret_source !== "none" && (
                <p className="mt-1 text-xs text-slate-400">Kosongkan jika tidak ingin mengubah secret yang sudah tersimpan.</p>
              )}
            </div>

            {/* Setup guide */}
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

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
