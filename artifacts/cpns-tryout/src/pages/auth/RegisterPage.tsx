import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../lib/auth-context";
import { Loader2 } from "lucide-react";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Password dan Konfirmasi Password tidak cocok.");
      return;
    }
    
    setLoading(true);
    try {
      // Simulate registration then auto login
      await login(email, password); // We use dummy login
      setLocation("/dashboard");
    } catch (err) {
      setError("Gagal mendaftar. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(150deg, #0A1C3C 0%, #1E4D9C 100%)" }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <Link href="/">
            <div className="w-12 h-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 cursor-pointer">
              S
            </div>
          </Link>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Masuk di sini
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password</label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              required
              id="terms"
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-slate-900">
              Saya menyetujui syarat & ketentuan yang berlaku
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Daftar Sekarang"}
          </button>
        </form>
      </div>
    </div>
  );
}
