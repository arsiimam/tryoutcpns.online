import React from "react";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { subscriptions } from "../../data/dummy-cpns-data";
import { useAuth } from "../../lib/auth-context";

export function LandingPage() {
  const { user } = useAuth();
  const isSignedIn = !!user;

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
                    <span className={`text-3xl font-black ${plan.name === 'Gold' ? 'text-white' : 'text-slate-900'}`}>
                      {plan.price === 0 ? 'Gratis' : `Rp ${plan.price.toLocaleString('id-ID')}`}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-sm ${plan.name === 'Gold' ? 'text-white/70' : 'text-slate-500'}`}>/bulan</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${plan.name === 'Gold' ? 'text-amber-300' : 'text-emerald-500'}`} />
                      <span className={`text-sm ${plan.name === 'Gold' ? 'text-white/90' : 'text-slate-600'}`}>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={isSignedIn ? "/subscription" : "/sign-up"}
                  className={`text-center py-3 px-6 rounded-xl font-semibold transition-all text-sm
                    ${plan.name === 'Gold'
                      ? 'bg-white text-primary hover:bg-amber-50'
                      : 'bg-primary text-white hover:bg-primary/90'}
                  `}
                >
                  {plan.price === 0 ? 'Mulai Gratis' : 'Pilih Paket'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Semua yang Anda Butuhkan untuk Lulus CPNS</h2>
            <p className="text-slate-600">Fitur lengkap dirancang khusus untuk memaksimalkan persiapan ujian Anda.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "🎯", title: "Simulasi CAT BKN", desc: "Ujian mirip asli dengan tampilan dan waktu yang identik dengan CAT BKN resmi." },
              { icon: "📊", title: "Analisis Nilai Mendalam", desc: "Lacak perkembangan per subtes, identifikasi kelemahan, dan optimalkan strategi belajar." },
              { icon: "📚", title: "10.000+ Soal HOTS", desc: "Bank soal terbarukan setiap bulan dengan pembahasan lengkap oleh tim ahli." },
              { icon: "🏆", title: "Ranking Nasional", desc: "Bandingkan skor Anda dengan peserta seluruh Indonesia dan ukur posisi kompetitif." },
              { icon: "⚡", title: "Mode Latihan Cepat", desc: "Latihan per topik kapan saja tanpa batasan waktu untuk pemahaman mendalam." },
              { icon: "📱", title: "Akses Multi-Device", desc: "Belajar dari mana saja — PC, tablet, dan smartphone dengan tampilan yang responsif." },
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Ribuan Peserta Sudah Membuktikan</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Andi Prasetyo", role: "Lulus CPNS Kemenkeu 2023", text: "Berkat SiapCPNS, saya berhasil lulus di percobaan pertama. Soal-soalnya sangat mirip dengan ujian asli!" },
              { name: "Sari Dewi", role: "Lulus CPNS Kemendikbud 2023", text: "Fitur analisis nilainya sangat membantu. Saya tahu persis bagian mana yang perlu diperkuat." },
              { name: "Budi Santoso", role: "Lulus CPNS Kemenkes 2023", text: "Simulasi CAT-nya bikin mental saya siap. Pas ujian beneran, saya sudah terbiasa dengan tekanannya." },
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Pertanyaan Umum</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Apakah soal-soal di SiapCPNS sesuai dengan ujian CPNS terbaru?", a: "Ya, tim kurator kami secara rutin memperbarui bank soal sesuai dengan kisi-kisi terbaru dari BKN." },
              { q: "Bisakah saya mencoba gratis sebelum berlangganan?", a: "Tentu! Paket Gratis kami memberikan akses ke fitur dasar tanpa batas waktu." },
              { q: "Bagaimana cara pembayaran untuk paket premium?", a: "Kami menerima transfer bank, kartu kredit/debit, dan berbagai metode pembayaran digital." },
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">{f.q}</h3>
                <p className="text-slate-600 text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Siap Wujudkan Karir Impian Anda?</h2>
          <p className="text-primary-foreground/80 text-white/80 mb-8">Bergabung dengan 50.000+ peserta yang sudah mempersiapkan diri dengan SiapCPNS.</p>
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="inline-flex items-center gap-2 h-12 px-8 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-all shadow-lg"
          >
            {isSignedIn ? "Ke Dashboard" : "Daftar Sekarang — Gratis"} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center text-white font-bold text-sm">S</div>
              <span className="font-bold text-white">SiapCPNS</span>
            </div>
            <p className="text-sm">© 2024 SiapCPNS. Hak cipta dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
