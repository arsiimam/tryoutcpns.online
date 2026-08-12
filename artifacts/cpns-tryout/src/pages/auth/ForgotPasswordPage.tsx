import React, { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import logoWhite from "../../assets/logo-white.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Terjadi kesalahan. Periksa koneksi internet Anda.");
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
          <Link href="/" className="inline-flex items-center justify-center mb-2">
            <img src={logoWhite} alt="Tryout CPNS Online" className="h-14 w-auto drop-shadow-lg" />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Lupa Password</h1>
          <p className="text-white/60 text-sm mt-1">Masukkan email Anda untuk menerima link reset</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <p className="font-semibold text-slate-800">Email terkirim!</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Link reset password telah dikirim ke <strong>{email}</strong>.<br />
                Cek juga folder Spam jika tidak muncul di inbox.
              </p>
              <Link href="/sign-in"
                className="inline-block w-full py-2.5 px-4 font-semibold rounded-xl text-white text-sm text-center transition-all"
                style={{ background: "#1E4D9C" }}>
                Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat Email</label>
                <input
                  required type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                Kirim Link Reset
              </button>

              <p className="text-center text-sm text-slate-500">
                <Link href="/sign-in" className="font-medium text-blue-600 hover:underline">← Kembali ke Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
