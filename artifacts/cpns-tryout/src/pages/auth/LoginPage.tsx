import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../lib/auth-context";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = React.useState("budi@example.com");
  const [password, setPassword] = React.useState("password123");
  const { login, isLoading } = useAuth();
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError("Email atau password salah.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(150deg, #0A1C3C 0%, #1E4D9C 100%)" }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-2xl border border-white/10">
        <div className="text-center">
          <Link href="/">
            <div className="w-12 h-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 cursor-pointer">
              S
            </div>
          </Link>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Masuk ke Akun
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Belum punya akun?{' '}
            <Link href="/register" className="font-medium text-primary hover:text-primary/80">
              Daftar gratis sekarang
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">
                Alamat Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="budi@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                Ingat saya
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-primary/80">
                Lupa password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Masuk"}
            </button>
          </div>
          
          <div className="mt-4 text-center text-xs text-slate-500">
            <p>Gunakan <strong>budi@example.com</strong> untuk Peserta</p>
            <p>Gunakan <strong>admin@siapcpns.id</strong> untuk Admin</p>
          </div>
        </form>
      </div>
    </div>
  );
}
