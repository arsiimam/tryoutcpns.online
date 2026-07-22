import React from "react";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { subscriptions } from "../../data/dummy-cpns-data";
import { useUser } from "@clerk/react";

export function LandingPage() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">SiapCPNS</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <a href="#fitur" className="hover:text-primary transition-colors">Fitur</a>
            <a href="#harga" className="hover:text-primary transition-colors">Paket & Harga</a>
            <a href="#testimoni" className="hover:text-primary transition-colors">Testimoni</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex gap-3">
            {isSignedIn ? (
              <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-md transition-colors shadow-sm">
                Ke Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="px-4 py-2 text-sm font-medium text-primary hover:bg-slate-100 rounded-md transition-colors">
                  Masuk
                </Link>
                <Link href="/sign-up" className="px-4 py-2 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-md transition-colors shadow-sm">
                  Daftar Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/[0.03] -z-10" />
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
            </span>
            Pendaftaran CPNS 2024 Segera Dibuka
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Lulus CPNS Bukan Lagi <br className="hidden md:block"/> Sekadar Mimpi.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Platform simulasi CAT BKN terakurat di Indonesia. Ribuan soal HOTS ter-update, 
            pembahasan mendalam, dan analisis skor berbasis AI untuk memastikan Anda siap hadapi ujian sebenarnya.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            {isSignedIn ? (
              <Link href="/dashboard" className="h-12 px-8 flex items-center justify-center gap-2 bg-primary text-white text-base font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl">
                Ke Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <Link href="/sign-up" className="h-12 px-8 flex items-center justify-center gap-2 bg-primary text-white text-base font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl">
                Mulai Tryout Gratis <ArrowRight size={18} />
              </Link>
            )}
            <a href="#harga" className="h-12 px-8 flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 text-base font-semibold rounded-lg hover:bg-slate-50 transition-all">
              Lihat Paket Premium
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <div className="text-3xl font-black text-primary mb-1">50K+</div>
            <div className="text-sm text-slate-500 font-medium">Pengguna Aktif</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-primary mb-1">10K+</div>
            <div className="text-sm text-slate-500 font-medium">Bank Soal HOTS</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-primary mb-1">98%</div>
            <div className="text-sm text-slate-500 font-medium">Tingkat Kemiripan</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-primary mb-1">4.9/5</div>
            <div className="text-sm text-slate-500 font-medium">Rating Peserta</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Investasi Kecil untuk Masa Depan Anda</h2>
            <p className="text-slate-600">Pilih paket yang sesuai dengan kebutuhan persiapan Anda. Semua paket premium bergaransi akses penuh ke semua fitur.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {subscriptions.map((plan) => (
              <div key={plan.id} className={`
                relative flex flex-col p-8 rounded-2xl border
                ${plan.name === 'Gold' ? 'bg-primary text-white border-primary shadow-2xl scale-105 z-10' : 'bg-white border-slate-200'}
              `}>
                {plan.name === 'Gold' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                    Paling Populer
                  </div>
                )}
                
                <h3 className={`text-xl font-bold mb-2 ${plan.name === 'Gold' ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <div className="mb-6">
                  {plan.originalPrice > plan.price && (
                    <div className={`text-sm line-through ${plan.name === 'Gold' ? 'text-white/60' : 'text-slate-400'}`}>
                      Rp {plan.originalPrice.toLocaleString('id-ID')}
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">Rp {plan.price.toLocaleString('id-ID')}</span>
                    <span className={`text-sm ${plan.name === 'Gold' ? 'text-white/80' : 'text-slate-500'}`}>/{plan.duration} hari</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-4 mb-8">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className={`shrink-0 ${plan.name === 'Gold' ? 'text-amber-400' : 'text-emerald-500'}`} />
                      <span className={`text-sm ${plan.name === 'Gold' ? 'text-white/90' : 'text-slate-600'}`}>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href={isSignedIn ? "/subscription" : "/sign-up"}
                  className={`
                    w-full h-12 flex items-center justify-center rounded-lg font-semibold transition-all
                    ${plan.name === 'Gold' 
                      ? 'bg-amber-500 text-white hover:bg-amber-600' 
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}
                  `}
                >
                  {isSignedIn ? `Pilih Paket ${plan.name}` : `Daftar & Pilih ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="font-bold text-xl tracking-tight text-white">SiapCPNS</span>
            </div>
            <p className="text-sm">Platform belajar CPNS terbaik di Indonesia. Persiapkan dirimu menjadi ASN dengan cara yang tepat.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Produk</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Tryout CAT</a></li>
              <li><a href="#" className="hover:text-white">Bank Soal</a></li>
              <li><a href="#harga" className="hover:text-white">Harga Paket</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Bantuan</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">FAQ</a></li>
              <li><a href="#" className="hover:text-white">Kontak Kami</a></li>
              <li><a href="#" className="hover:text-white">Syarat & Ketentuan</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-sm text-center">
          &copy; {new Date().getFullYear()} SiapCPNS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
