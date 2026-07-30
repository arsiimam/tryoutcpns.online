import React, { useState } from "react";
import { Link } from "wouter";
import { Mail, Phone, Clock, MapPin, Send } from "lucide-react";

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="font-bold text-xl tracking-tight text-primary">SiapCPNS</span>
            </div>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">Paket & Harga</Link>
            <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link href="/contact" className="text-primary font-bold transition-colors">Kontak</Link>
          </nav>
        </div>
      </header>

      <section className="py-20 px-4 flex-1">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6">Hubungi Kami</h1>
            <p className="text-lg text-slate-600 mb-8">
              Punya pertanyaan seputar paket langganan atau kendala teknis? Tim kami siap membantu Anda.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Email</h3>
                  <p className="text-slate-600">support@siapcpns.id</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">WhatsApp</h3>
                  <p className="text-slate-600">+62 812 3456 7890</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Jam Operasional</h3>
                  <p className="text-slate-600">Senin - Jumat, 09:00 - 17:00 WIB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Kirim Pesan</h2>
            {submitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 size={24} className="shrink-0" />
                <p>Pesan berhasil terkirim! Tim kami akan segera merespon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Masukkan nama Anda" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input required type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" placeholder="alamat@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subjek</label>
                  <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Topik pesan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pesan</label>
                  <textarea required rows={4} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" placeholder="Tulis pesan Anda di sini..."></textarea>
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors">
                  Kirim Pesan <Send size={18} />
                </button>
              </form>
            )}
          </div>
          
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        &copy; {new Date().getFullYear()} SiapCPNS. All rights reserved.
      </footer>
    </div>
  );
}

import { CheckCircle2 } from "lucide-react";