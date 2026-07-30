import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { dummyApi } from "../../lib/dummy-api";
import { Subscription } from "../../data/dummy-cpns-data";

export function PricingPage() {
  const [plans, setPlans] = useState<Subscription[]>([]);

  useEffect(() => {
    dummyApi.getSubscriptions().then(setPlans);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navbar - reuse from LandingPage */}
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
            <Link href="/pricing" className="text-primary font-bold transition-colors">Paket & Harga</Link>
            <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Kontak</Link>
          </nav>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-primary hover:bg-slate-100 rounded-md transition-colors">
              Masuk
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-md transition-colors shadow-sm">
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            Pilih Paket yang Tepat untuk Lulus CPNS
          </h1>
          <p className="text-lg text-slate-600">
            Mulai dari paket gratis hingga bimbingan premium. Pilih sesuai kebutuhan belajarmu dan mulailah bersiap hari ini.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`
              relative flex flex-col p-8 rounded-2xl border bg-white
              ${plan.name === 'Gold' ? 'border-primary shadow-xl ring-2 ring-primary scale-105 z-10' : 'border-slate-200 shadow-sm'}
            `}>
              {plan.name === 'Gold' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                  Paling Populer
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                {plan.originalPrice > plan.price && (
                  <div className="text-sm line-through text-slate-400">
                    Rp {plan.originalPrice.toLocaleString('id-ID')}
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">
                    Rp {plan.price.toLocaleString('id-ID')}
                  </span>
                  <span className="text-slate-500">/{plan.duration} hari</span>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {plan.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={20} className={plan.name === 'Gold' ? 'text-amber-500' : 'text-emerald-500'} />
                    <span className="text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href="/register" 
                className={`
                  w-full h-12 flex items-center justify-center rounded-xl font-bold transition-all
                  ${plan.name === 'Gold' 
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-md' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
                `}
              >
                Pilih Paket {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} SiapCPNS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
