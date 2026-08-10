import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

type View = "options" | "email-form";

export function SignUpPage() {
  const { refetch, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [view, setView] = useState<View>("options");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      setLocation(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleGoogle = () => {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Pendaftaran gagal.");
        return;
      }
      // Session is set on server — refresh auth context then redirect
      await refetch();
      setLocation("/dashboard");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(150deg, #0A1C3C 0%, #1E4D9C 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-2">
            <img src="/logo-white.png" alt="Tryout CPNS Online" className="h-14 w-auto drop-shadow-lg" />
          </Link>

          {view === "options" && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mt-4">Buat akun baru</h1>
              <p className="text-slate-500 text-sm mt-1">Mulai persiapan CPNS kamu sekarang — gratis!</p>
            </>
          )}
          {view === "email-form" && (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mt-4">Daftar dengan Email</h1>
              <p className="text-slate-500 text-sm mt-1">Isi data di bawah untuk membuat akun</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

          {/* ── PILIH METODE ── */}
          {view === "options" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full h-14 flex items-center gap-4 px-5 rounded-xl border-2 border-slate-200 hover:border-primary/40 hover:bg-slate-50 transition-all group disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 size={22} className="animate-spin text-slate-400" />
                ) : (
                  <GoogleIcon size={22} />
                )}
                <div className="text-left">
                  <div className="font-semibold text-slate-800 text-sm group-hover:text-slate-900">Daftar dengan Google</div>
                  <div className="text-xs text-slate-400">Cepat, tanpa verifikasi email</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setError(""); setView("email-form"); }}
                className="w-full h-14 flex items-center gap-4 px-5 rounded-xl border-2 border-slate-200 hover:border-primary/40 hover:bg-slate-50 transition-all group"
              >
                <Mail size={22} className="text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-slate-800 text-sm group-hover:text-slate-900">Daftar dengan Email</div>
                  <div className="text-xs text-slate-400">Gunakan email dan password</div>
                </div>
              </button>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
              )}
            </div>
          )}

          {/* ── FORM EMAIL + PASSWORD ── */}
          {view === "email-form" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => { setError(""); setView("options"); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-2 transition-colors"
              >
                ← Kembali ke pilihan
              </button>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Nama lengkap Anda"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nama@email.com"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 8 karakter"
                    minLength={8}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    minLength={8}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Daftar
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Sudah punya akun?{" "}
          <Link href="/sign-in" className="text-primary font-semibold hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
