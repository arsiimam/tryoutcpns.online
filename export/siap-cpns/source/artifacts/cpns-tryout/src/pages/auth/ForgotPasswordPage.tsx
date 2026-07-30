import React, { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <Link href="/">
            <div className="w-12 h-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 cursor-pointer">
              S
            </div>
          </Link>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Lupa Password
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Masukkan email Anda untuk menerima tautan reset password.
          </p>
        </div>

        {submitted ? (
          <div className="mt-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-slate-700">Link reset password telah dikirim ke <strong>{email}</strong>.</p>
            <Link href="/login" className="inline-block w-full py-2.5 px-4 font-semibold rounded-md text-white bg-primary hover:bg-primary/90 transition-colors shadow-md">
              Kembali ke Halaman Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alamat Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 font-semibold rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-md transition-colors"
              >
                Kirim Link Reset
              </button>
            </div>
            
            <div className="text-center text-sm">
              <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                Kembali ke Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
