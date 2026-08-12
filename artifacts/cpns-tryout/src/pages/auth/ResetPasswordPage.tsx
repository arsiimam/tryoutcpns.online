import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import logoWhite from "../../assets/logo-white.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();

  const [password, setPassword]     = useState("");
  const [confirm,  setConfirm]      = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading,  setLoading]      = useState(false);
  const [error,    setError]        = useState("");
  const [success,  setSuccess]      = useState(false);

  useEffect(() => {
    if (!token) navigate("/sign-in");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password minimal 8 karakter."); return; }
    if (password !== confirm)  { setError("Password tidak cocok."); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Link tidak valid atau sudah kedaluwarsa."); return; }
      setSuccess(true);
      setTimeout(() => navigate("/sign-in"), 3000);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(150deg, #0A1C3C 0%, #1E4D9C 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center justify-center mb-2">
            <img src={logoWhite} alt="Tryout CPNS Online" className="h-14 w-auto drop-shadow-lg" />
          </a>
          <h1 className="text-2xl font-bold text-white mt-4">Buat Password Baru</h1>
          <p className="text-white/60 text-sm mt-1">Masukkan password baru untuk akun Anda</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <p className="font-semibold text-slate-800">Password berhasil diubah!</p>
              <p className="text-sm text-slate-500">Mengalihkan ke halaman login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required minLength={8}
                    placeholder="Minimal 8 karakter"
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Ulangi password baru"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  <XCircle size={15} className="shrink-0" /> {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-xl text-white font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "#1E4D9C" }}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                Simpan Password Baru
              </button>

              <p className="text-center text-sm text-slate-500">
                <a href="/sign-in" className="font-medium text-blue-600 hover:underline">← Kembali ke Login</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
