import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { dummyApi } from "../../lib/dummy-api";

export function FaqPage() {
  const [faqs, setFaqs] = useState<{question: string, answer: string}[]>([]);
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    dummyApi.adminGetCmsContent().then(content => {
      // Adding some more dummy FAQs if content.faq is too short
      const baseFaqs = content.faq;
      const extraFaqs = [
        { question: "Bagaimana cara membeli paket premium?", answer: "Anda dapat mendaftar akun, masuk ke menu Langganan, pilih paket, dan ikuti instruksi pembayaran via Virtual Account atau e-Wallet." },
        { question: "Apakah tryout bisa diulang?", answer: "Tentu, untuk pengguna premium Anda dapat mengulang latihan soal dan melihat kembali review pembahasan kapan saja." },
        { question: "Apakah ada aplikasi mobile?", answer: "Saat ini SiapCPNS dioptimalkan untuk web browser, baik di desktop maupun mobile." },
        { question: "Bagaimana jika lupa password?", answer: "Gunakan fitur 'Lupa Password' pada halaman login. Link reset password akan dikirim ke email terdaftar." },
      ];
      setFaqs([...baseFaqs, ...extraFaqs]);
    });
  }, []);

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(search.toLowerCase()) || 
    f.answer.toLowerCase().includes(search.toLowerCase())
  );

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
            <Link href="/faq" className="text-primary font-bold transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Kontak</Link>
          </nav>
        </div>
      </header>

      <section className="pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6">
            Pertanyaan yang Sering Diajukan
          </h1>
          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-400" size={20} />
            </div>
            <input 
              type="text" 
              className="w-full pl-11 pr-4 py-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm bg-white"
              placeholder="Cari pertanyaan Anda di sini..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center text-slate-500 py-8">Tidak ada hasil ditemukan.</div>
          ) : (
            filteredFaqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <button 
                  className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="font-semibold text-slate-800">{faq.question}</span>
                  {openIndex === i ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 bg-slate-50">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto text-center">
        &copy; {new Date().getFullYear()} SiapCPNS. All rights reserved.
      </footer>
    </div>
  );
}
