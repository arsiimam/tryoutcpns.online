import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../lib/auth-context";
import "./LandingPage.css";

/* ------------------------------------------------------------------ */
/* Icons (inline SVG helpers)                                          */
/* ------------------------------------------------------------------ */
const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcoArrow = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IcoChevDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IcoClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IcoMenu = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const IcoX = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Countdown timer hook                                                */
/* ------------------------------------------------------------------ */
function useCountdown(initial: number) {
  const [secs, setSecs] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : initial)), 1000);
    return () => clearInterval(id);
  }, [initial]);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* ------------------------------------------------------------------ */
/* Smooth scroll helper                                                */
/* ------------------------------------------------------------------ */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  const { user } = useAuth();
  const isSignedIn = !!user;
  const [, navigate] = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<string>("B");

  const timer = useCountdown(45 * 60 + 23);

  function closeMobile() { setMobileOpen(false); }
  function toggleFaq(i: number) { setOpenFaq(p => (p === i ? null : i)); }

  const primaryCta = isSignedIn ? "/dashboard" : "/sign-up";

  // Close mobile menu on outside click
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  /* ---- FAQ items ---- */
  const faqs = [
    {
      q: "Apa itu Tryout CPNS berbasis CAT?",
      a: "Tryout CPNS berbasis CAT adalah simulasi ujian yang menggunakan sistem Computer Assisted Test, sama persis dengan sistem yang digunakan BKN pada ujian CPNS resmi, lengkap dengan timer, navigasi soal, dan penilaian otomatis.",
    },
    {
      q: "Bagaimana cara berlangganan?",
      a: "Anda cukup memilih salah satu paket berlangganan yang tersedia, lalu melakukan pembayaran melalui metode yang disediakan. Akses akan langsung aktif setelah pembayaran berhasil dikonfirmasi.",
    },
    {
      q: "Apakah ada tryout gratis?",
      a: "Ya, kami menyediakan paket gratis dengan akses 1 tryout dan bank soal TWK terbatas sehingga Anda bisa mencoba platform ini sebelum berlangganan.",
    },
    {
      q: "Bagaimana sistem penilaian CPNS?",
      a: "Untuk TWK dan TIU, jawaban benar bernilai 5 dan jawaban salah atau tidak dijawab bernilai 0. Untuk TKP, setiap jawaban memiliki bobot nilai 1 sampai 5 tergantung tingkat kesesuaiannya.",
    },
    {
      q: "Apakah hasil tryout saya tersimpan?",
      a: "Ya, seluruh riwayat dan hasil tryout Anda tersimpan otomatis di akun Anda sehingga bisa dilihat dan dianalisis kapan saja.",
    },
    {
      q: "Apakah aplikasi bisa diakses dari tablet?",
      a: "Bisa. Platform ini responsif dan dapat diakses dengan lancar dari desktop, tablet, maupun smartphone melalui browser.",
    },
  ];

  /* ---- Price plans ---- */
  const plans = [
    {
      tag: "Paket Gratis",
      tagClass: "",
      price: "Gratis",
      period: "Selamanya",
      features: ["Akses 1 tryout gratis", "Bank soal TWK (terbatas)", "Hasil & skor dasar"],
      btnClass: "dark",
      btnLabel: "Mulai Gratis",
      popular: false,
      href: "/sign-up",
    },
    {
      tag: "Paket Bulanan",
      tagClass: "blue",
      price: "Rp 49.000",
      period: "30 hari",
      features: [
        "Semua tryout terbuka",
        "Bank soal lengkap TWK/TIU/TKP",
        "Review & pembahasan",
        "Analisis skor mendalam",
        "Ranking nasional",
      ],
      btnClass: "blue",
      btnLabel: "Pilih Paket",
      popular: true,
      href: isSignedIn ? "/subscription" : "/sign-up",
    },
    {
      tag: "Paket Premium",
      tagClass: "purple",
      price: "Rp 149.000",
      period: "90 hari",
      features: [
        "Semua fitur Paket Bulanan",
        "Tryout eksklusif tiap minggu",
        "Konsultasi mentor privat",
        "Video pembahasan",
        "Garansi lulus",
      ],
      btnClass: "purple",
      btnLabel: "Pilih Paket",
      popular: false,
      href: isSignedIn ? "/subscription" : "/sign-up",
    },
  ];

  /* ---- Hero card options ---- */
  const options = [
    { key: "A", label: "1 Juni 1945" },
    { key: "B", label: "18 Agustus 1945" },
    { key: "C", label: "17 Agustus 1945" },
  ];

  return (
    <div className="tryout-landing">

      {/* ===================== NAV ===================== */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-brand">
            <img src="/logo-landing.png" alt="Tryout CPNS Online" className="lp-brand-img" />
          </Link>

          <nav className="lp-nav-links">
            <a href="#fitur" onClick={() => scrollTo("fitur")}>Keunggulan</a>
            <a href="#testimoni" onClick={() => scrollTo("testimoni")}>Testimoni</a>
            <a href="#paket" onClick={() => scrollTo("paket")}>Paket</a>
            <a href="#faq" onClick={() => scrollTo("faq")}>Blog</a>
          </nav>

          <div className="lp-nav-right">
            {isSignedIn ? (
              <Link href="/dashboard" className="lp-btn-login">Dashboard</Link>
            ) : (
              <Link href="/sign-in" className="lp-btn-login">Login</Link>
            )}
          </div>

          <button className="lp-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Buka menu">
            {mobileOpen ? <IcoX /> : <IcoMenu />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lp-mobile-menu open" ref={mobileMenuRef}>
            <a href="#fitur" onClick={() => { scrollTo("fitur"); closeMobile(); }}>Keunggulan</a>
            <a href="#testimoni" onClick={() => { scrollTo("testimoni"); closeMobile(); }}>Testimoni</a>
            <a href="#paket" onClick={() => { scrollTo("paket"); closeMobile(); }}>Paket</a>
            <a href="#faq" onClick={() => { scrollTo("faq"); closeMobile(); }}>Blog</a>
            {isSignedIn ? (
              <Link href="/dashboard" className="lp-btn-login" onClick={closeMobile}>Dashboard</Link>
            ) : (
              <Link href="/sign-in" className="lp-btn-login" onClick={closeMobile}>Login</Link>
            )}
          </div>
        )}
      </header>

      {/* ===================== HERO ===================== */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-grid">
          {/* Left column */}
          <div>
            <div className="lp-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Platform Simulasi CAT #1
            </div>

            <h1 className="lp-hero-title">
              Lolos CPNS dengan
              <span className="lp-accent">Simulasi CAT Terbaik</span>
            </h1>

            <p className="lp-hero-desc">
              Latihan soal TWK, TIU, dan TKP dengan sistem yang sama persis seperti ujian resmi BKN.
              Tingkatkan peluang lulus Anda.
            </p>

            <div className="lp-hero-ctas">
              <Link href={primaryCta}>
                <button className="lp-btn-lg-primary">
                  {isSignedIn ? "Ke Dashboard" : "Mulai Tryout Gratis"} <IcoArrow />
                </button>
              </Link>
              <button className="lp-btn-lg-ghost" onClick={() => scrollTo("fitur")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Lihat Fitur
              </button>
            </div>

            <div className="lp-stats">
              <div className="lp-stat"><div className="lp-num">10.000+</div><div className="lp-lbl">Peserta</div></div>
              <div className="lp-stat"><div className="lp-num">85%</div><div className="lp-lbl">Lolos</div></div>
              <div className="lp-stat"><div className="lp-num">500+</div><div className="lp-lbl">Soal</div></div>
            </div>
          </div>

          {/* Right column — interactive card */}
          <div className="lp-hero-card-wrap">
            <div className="lp-hero-card">
              <div className="lp-card-header">
                <div className="lp-card-header-left">
                  <div className="lp-mini-logo">CP</div>
                  <div className="lp-lbl">Simulasi CAT</div>
                </div>
                <div className="lp-timer">
                  <IcoClock /> {timer}
                </div>
              </div>

              <div className="lp-qbox">
                <div className="lp-qnum">SOAL NO. 5 DARI 110</div>
                <div className="lp-qtext">
                  Pancasila sebagai dasar negara Indonesia ditetapkan secara resmi pada tanggal?
                </div>

                {options.map(opt => (
                  <div
                    key={opt.key}
                    className={`lp-opt${selectedOpt === opt.key ? " selected" : ""}`}
                    onClick={() => setSelectedOpt(opt.key)}
                  >
                    <span className="lp-letter">{opt.key}</span>
                    {opt.label}
                  </div>
                ))}

                <div className="lp-qnav">
                  <div className="lp-qnums">
                    {[1, 2, 3, 4].map(n => (
                      <span key={n}>{n}</span>
                    ))}
                    <span className="active">5</span>
                    {[6, 7, 8].map(n => (
                      <span key={n} className="gray">{n}</span>
                    ))}
                  </div>
                  <button
                    className="lp-next-link"
                    onClick={() => navigate(isSignedIn ? "/tryout" : "/sign-up")}
                  >
                    Selanjutnya <IcoArrow size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="lp-section" id="fitur">
        <div className="lp-container">
          <div className="lp-eyebrow">Fitur Unggulan</div>
          <h2 className="lp-section-title">Semua yang Anda butuhkan untuk lulus</h2>
          <p className="lp-section-sub">Platform yang dirancang khusus untuk memaksimalkan persiapan ujian CPNS Anda.</p>

          <div className="lp-feature-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3>Simulasi CAT Realistis</h3>
              <p>Sistem identik dengan ujian resmi BKN: timer, navigasi, dan auto-save.</p>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3>Bank Soal Lengkap</h3>
              <p>Ribuan soal TWK, TIU, TKP dengan pembahasan mendalam dan kategori terstruktur.</p>
            </div>

            <div className="lp-feature-card highlight">
              <div className="lp-feature-icon filled">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3>Analisis Skor Mendalam</h3>
              <p>Lihat kelemahan dan kelebihan Anda dengan grafik perkembangan per kategori.</p>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <h3>Soal Berkualitas</h3>
              <p>Disusun oleh tim ahli berpengalaman sesuai kisi-kisi CPNS terbaru.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section className="lp-section lp-section-soft" id="paket">
        <div className="lp-container">
          <div className="lp-eyebrow">Paket Berlangganan</div>
          <h2 className="lp-section-title">Pilih paket yang sesuai untuk Anda</h2>
          <p className="lp-section-sub">Investasi terbaik untuk masa depan karir ASN Anda.</p>

          <div className="lp-pricing-grid">
            {plans.map((plan) => (
              <div key={plan.tag} className={`lp-price-card${plan.popular ? " popular" : ""}`}>
                {plan.popular && <div className="lp-popular-badge">★ Populer</div>}
                <span className={`lp-plan-tag${plan.tagClass ? ` ${plan.tagClass}` : ""}`}>{plan.tag}</span>
                <div className="lp-price">{plan.price}</div>
                <div className="lp-price-period">{plan.period}</div>
                <ul className="lp-price-features">
                  {plan.features.map(f => (
                    <li key={f}>
                      <span style={{ display: "inline-flex", flexShrink: 0 }}><IcoCheck /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <button className={`lp-price-btn ${plan.btnClass}`}>{plan.btnLabel}</button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section className="lp-section" id="testimoni">
        <div className="lp-container">
          <div className="lp-eyebrow">Testimoni</div>
          <h2 className="lp-section-title">Cerita sukses peserta kami</h2>

          <div className="lp-testi-grid">
            {[
              { init: "A", name: "Ahmad Fauzi", role: "Lolos CPNS 2024", text: "Tryout ini sangat membantu! Simulasinya mirip banget dengan ujian aslinya. Saya jadi lebih percaya diri." },
              { init: "S", name: "Siti Nurhaliza", role: "Peserta CPNS 2025", text: "Bank soalnya lengkap dan pembahasannya jelas. Fitur analisis skor bikin tahu kelemahan saya." },
              { init: "B", name: "Budi Santoso", role: "Lolos PNS Kemenkeu", text: "Timer dan navigasi soalnya akurat. Auto-save bikin tenang kalau koneksi putus. Recommended!" },
            ].map(t => (
              <div key={t.name} className="lp-testi-card">
                <div className="lp-testi-quote">"</div>
                <div className="lp-stars">★★★★★</div>
                <p className="lp-testi-text">"{t.text}"</p>
                <div className="lp-testi-person">
                  <div className="lp-avatar">{t.init}</div>
                  <div>
                    <div className="lp-name">{t.name}</div>
                    <div className="lp-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="lp-section lp-section-soft" id="faq">
        <div className="lp-container">
          <div className="lp-eyebrow">FAQ</div>
          <h2 className="lp-section-title">Pertanyaan yang sering diajukan</h2>
          <br />
          <div className="lp-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`lp-faq-item${openFaq === i ? " open" : ""}`}>
                <button className="lp-faq-q" onClick={() => toggleFaq(i)}>
                  {faq.q}
                  <span className="lp-faq-chev"><IcoChevDown /></span>
                </button>
                <div className="lp-faq-a">
                  <div className="lp-faq-a-inner">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-cta">
          <h2>Siap Lolos CPNS?</h2>
          <p>Bergabung dengan ribuan peserta yang sudah berhasil. Mulai tryout gratis hari ini juga.</p>
          <Link href={primaryCta}>
            <button className="lp-btn-lg-ghost">
              {isSignedIn ? "Ke Dashboard" : "Daftar Sekarang"} <IcoArrow />
            </button>
          </Link>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            {/* Brand */}
            <div>
              <div className="lp-footer-logo-wrap">
                <img src="/logo.png" alt="Tryout CPNS Online" />
              </div>
              <p className="lp-footer-desc">
                Platform tryout CPNS berbasis CAT terdepan di Indonesia. Persiapkan ujian dengan sistem yang sama persis dengan ujian resmi.
              </p>
              <div className="lp-socials">
                <a href="#" aria-label="Facebook">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9v-2.89h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" /></svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                </a>
                <a href="#" aria-label="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
                </a>
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4>Platform</h4>
              <ul>
                <li><Link href={isSignedIn ? "/tryout" : "/sign-up"}>Tryout</Link></li>
                <li><Link href={isSignedIn ? "/latihan" : "/sign-up"}>Latihan Soal</Link></li>
                <li><Link href={isSignedIn ? "/ranking" : "/sign-up"}>Ranking</Link></li>
                <li><Link href={isSignedIn ? "/subscription" : "/sign-up"}>Paket Berlangganan</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4>Perusahaan</h4>
              <ul>
                <li><a href="#">Tentang Kami</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#faq" onClick={() => scrollTo("faq")}>FAQ</a></li>
                <li><a href="#">Kontak</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4>Hubungi Kami</h4>
              <div className="lp-contact-item" style={{ marginBottom: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6z" /><polyline points="22 6 12 13 2 6" /></svg>
                info@tryoutcpns.id
              </div>
              <div className="lp-contact-item" style={{ marginBottom: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                +62 812 3456 7890
              </div>
              <div className="lp-contact-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                Jakarta, Indonesia
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            © 2026 Tryout CPNS. Seluruh hak cipta dilindungi.
          </div>
        </div>
      </footer>

    </div>
  );
}
