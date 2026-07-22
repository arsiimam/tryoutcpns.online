import React, { useState } from "react";
import { useSignIn } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isReady = fetchStatus !== "fetching";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;
    setLoading(true);
    setError("");
    try {
      const { error: pwError } = await signIn.password({ identifier: email, password });
      if (pwError) {
        setError(pwError.longMessage ?? pwError.message ?? "Email atau password salah.");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
        setLocation("/dashboard");
      } else {
        setError("Login gagal. Silakan coba lagi.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!signIn) return;
    setGoogleLoading(true);
    setError("");
    try {
      const { error: ssoError } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}${basePath}/sign-in/sso-callback`,
      });
      if (ssoError) {
        setError(ssoError.longMessage ?? ssoError.message ?? "Gagal login dengan Google.");
        setGoogleLoading(false);
      }
      // on success the browser navigates away — no need to setGoogleLoading(false)
    } catch (err: any) {
      setError("Gagal login dengan Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-lg">S</div>
            <span className="font-extrabold text-2xl text-primary">SiapCPNS</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">Masuk ke akun Anda</h1>
          <p className="text-slate-500 text-sm mt-1">Selamat datang kembali!</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={!isReady || googleLoading || loading}
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
              disabled={!isReady || loading || googleLoading}
              className="w-full h-11 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Masuk
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Belum punya akun?{" "}
          <Link href="/sign-up" className="text-primary font-semibold hover:underline">Daftar Gratis</Link>
        </p>
      </div>
    </div>
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
