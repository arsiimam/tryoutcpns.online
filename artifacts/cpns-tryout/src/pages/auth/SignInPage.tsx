import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import logoWhite from "../../assets/logo-white.png";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth-context";


export function SignInPage() {
  const { login, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      setLocation(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [user, isLoading, setLocation]);

  // Handle error from URL params (e.g. after Google OAuth failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "google_failed") {
      setError("Gagal login dengan Google. Coba lagi.");
    } else if (err === "google_cancelled") {
      setError("Login dengan Google dibatalkan.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      // login() updates auth context; redirect handled by useEffect above
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    window.location.href = "/api/auth/google";
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(150deg, #0A1C3C 0%, #1E4D9C 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-2">
            <img src={logoWhite} alt="Tryout CPNS Online" className="h-14 w-auto drop-shadow-lg" />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Masuk ke akun Anda</h1>
          <p className="text-white/60 text-sm mt-1">Selamat datang kembali!</p>
        </div>

        <div className="bg-white rounded-2xl border border-white/10 shadow-2xl p-8 space-y-5">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-all disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin text-slate-400" />
            ) : (
              <GoogleIcon />
            )}
            Masuk dengan Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">atau dengan email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email + Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Lupa password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
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

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-11 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Masuk
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/60 mt-6">
          Belum punya akun?{" "}
          <Link href="/sign-up" className="text-[#E6B134] font-semibold hover:underline">Daftar Gratis</Link>
        </p>
      </div>
    </div>
  );
}

function AppLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className={className} aria-label="Tryout CPNS Online">
      <rect width="48" height="48" rx="10" fill="white" fillOpacity="0.15"/>
      <path d="M12 24C12 17.373 17.373 12 24 12C27.314 12 30.314 13.343 32.485 15.515" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
      <path d="M36 24C36 30.627 30.627 36 24 36C20.686 36 17.686 34.657 15.515 32.485" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="5" fill="#f59e0b"/>
      <path d="M24 19V16M24 32V29M19 24H16M32 24H29" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
