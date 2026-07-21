import React, { useMemo, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { categories, subCategories, Category } from "../../data/dummy-cpns-data";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LayoutGrid,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Question generator (deterministic per seed)
───────────────────────────────────────────── */
interface PracticeQuestion {
  id: string;
  categoryId: string;
  subCategoryId: string;
  text: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  difficulty: "mudah" | "sedang" | "sulit";
}

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

// Simple deterministic pseudo-random based on seed
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const TWK_TEXTS = [
  "Pancasila sebagai dasar negara mengandung nilai-nilai luhur bangsa. Sila ke-3 Pancasila berbunyi...",
  "Pembukaan UUD 1945 alinea ke-4 memuat...",
  "Sistem pemerintahan Indonesia berdasarkan UUD 1945 adalah...",
  "Nilai yang terkandung dalam sila Kemanusiaan yang Adil dan Beradab antara lain...",
  "Bhineka Tunggal Ika pertama kali muncul dalam kitab...",
  "Pasal 1 ayat (3) UUD 1945 menyebutkan bahwa Indonesia adalah negara...",
  "Tugas dan wewenang MPR sesuai UUD 1945 adalah...",
  "NKRI sebagai bentuk negara Indonesia tercantum dalam UUD 1945 Pasal...",
  "Makna semangat persatuan dan kesatuan bangsa Indonesia tercermin dalam...",
  "Hak asasi manusia di Indonesia dilindungi oleh UUD 1945 Pasal...",
  "Wawasan Nusantara adalah cara pandang bangsa Indonesia terhadap...",
  "Peran Indonesia dalam menjaga perdamaian dunia sesuai alinea ke-4 Pembukaan UUD 1945 adalah...",
  "Salah satu nilai yang terkandung dalam Pancasila sila ke-5 adalah...",
  "Nasionalisme dalam konteks NKRI berarti...",
  "Dasar hukum kebebasan beragama di Indonesia terdapat dalam...",
  "Makna dari Negara Kesatuan Republik Indonesia adalah...",
  "Fungsi utama DPR sesuai UUD 1945 adalah...",
  "Integrasi nasional dapat terwujud apabila...",
  "Nilai ketuhanan dalam Pancasila tercermin dalam kehidupan sehari-hari melalui...",
  "Kedaulatan rakyat menurut UUD 1945 dilaksanakan oleh...",
];

const TIU_TEXTS = [
  "Jika 2x + 5 = 17, maka nilai x adalah...",
  "Analogi: BUKU : PERPUSTAKAAN = LUKISAN : ...",
  "Deret angka: 2, 4, 8, 16, ... angka berikutnya adalah...",
  "Jika semua mahasiswa rajin, dan Budi adalah mahasiswa, maka...",
  "Dari 10 siswa, dipilih 3 orang sebagai pengurus. Berapa banyak cara pemilihan?",
  "Silogisme: Semua dokter adalah sarjana. Rina bukan sarjana. Maka...",
  "Perbandingan umur Andi dan Budi adalah 3:4. Jika jumlah umur keduanya 42 tahun, umur Andi adalah...",
  "Antonim dari kata PROGRESIF adalah...",
  "Sebuah persegi panjang memiliki panjang 12 cm dan lebar 8 cm. Luasnya adalah...",
  "Jika P lebih tinggi dari Q, dan R lebih pendek dari P namun lebih tinggi dari Q, maka urutan dari tertinggi adalah...",
  "Akar dari 144 adalah...",
  "Sinonim dari kata AMBIGUITAS adalah...",
  "Rata-rata nilai 5 siswa adalah 78. Jika seorang siswa ditambahkan dengan nilai 90, rata-rata menjadi...",
  "Analogi: AIR : HAUS = MAKANAN : ...",
  "Deret: 1, 1, 2, 3, 5, 8, ... angka berikutnya adalah...",
  "Jika harga barang naik 20% lalu turun 20%, maka harga akhir dibanding awal...",
  "Dari soal logika: Semua A adalah B, Beberapa B adalah C. Maka...",
  "Luas lingkaran dengan jari-jari 7 cm (π=22/7) adalah...",
  "Pernyataan: Tidak ada kucing yang suka air. Si Belang suka air. Maka Si Belang...",
  "Kecepatan kereta A adalah 60 km/jam dan B adalah 90 km/jam. Jarak keduanya 450 km. Berapa lama sampai bertemu?",
];

const TKP_TEXTS = [
  "Saat rekan kerja Anda membuat kesalahan yang berpotensi merugikan perusahaan, sikap terbaik Anda adalah...",
  "Anda mendapat tugas yang harus diselesaikan dalam waktu singkat. Apa yang Anda lakukan pertama kali?",
  "Atasan Anda meminta Anda melakukan sesuatu yang bertentangan dengan prosedur. Anda akan...",
  "Ketika terjadi konflik antar rekan kerja dalam tim, peran Anda sebagai anggota tim adalah...",
  "Anda menerima kritik dari pelanggan terhadap layanan Anda. Respons terbaik Anda adalah...",
  "Seorang kolega meminta bantuan pekerjaan padahal Anda sedang sibuk. Anda akan...",
  "Dalam situasi kerja yang penuh tekanan, cara terbaik untuk tetap produktif adalah...",
  "Jika mendapat nilai rendah dalam evaluasi kinerja, Anda akan...",
  "Anda menemukan penyimpangan anggaran dalam laporan keuangan. Tindakan Anda adalah...",
  "Ketika menerima tugas baru yang belum pernah Anda kerjakan, yang pertama Anda lakukan adalah...",
  "Dalam rapat tim, pendapat Anda tidak diterima oleh mayoritas. Anda akan...",
  "Cara terbaik membangun kepercayaan dengan rekan kerja adalah...",
  "Anda menyadari prosedur lama lebih lambat dari cara baru yang Anda temukan. Anda akan...",
  "Jika pekerjaan Anda terhambat karena menunggu bagian lain, yang Anda lakukan adalah...",
  "Sikap yang mencerminkan integritas dalam bekerja adalah...",
  "Ketika harus mempresentasikan hasil kerja di depan pimpinan, Anda akan...",
  "Menghadapi pelanggan yang marah dan tidak puas, cara terbaik adalah...",
  "Komitmen terhadap pekerjaan terbaik ditunjukkan dengan...",
  "Dalam situasi darurat di kantor, hal pertama yang Anda lakukan adalah...",
  "Cara Anda meningkatkan kompetensi diri secara berkelanjutan adalah...",
];

const OPTION_TEXTS: Record<string, string[][]> = {
  "cat-1": TWK_TEXTS.map((_, i) => [
    `Pilihan A yang berkaitan dengan materi soal ${i + 1}`,
    `Pilihan B yang berkaitan dengan materi soal ${i + 1} (jawaban benar)`,
    `Pilihan C yang berkaitan dengan materi soal ${i + 1}`,
    `Pilihan D yang berkaitan dengan materi soal ${i + 1}`,
    `Pilihan E yang berkaitan dengan materi soal ${i + 1}`,
  ]),
  "cat-2": TIU_TEXTS.map((_, i) => [
    `Pilihan A – hasil perhitungan ${i + 1}`,
    `Pilihan B – hasil perhitungan ${i + 1} (jawaban benar)`,
    `Pilihan C – hasil perhitungan ${i + 1}`,
    `Pilihan D – hasil perhitungan ${i + 1}`,
    `Pilihan E – hasil perhitungan ${i + 1}`,
  ]),
  "cat-3": TKP_TEXTS.map((_, i) => [
    `Mengabaikan situasi tersebut`,
    `Segera melaporkan ke atasan dan mencari solusi bersama`,
    `Menunggu hingga ada instruksi lebih lanjut`,
    `Mendiskusikan dengan rekan kerja untuk mencari jalan keluar`,
    `Menyelesaikan dengan inisiatif sendiri tanpa melapor`,
  ]),
};

const CAT_QUESTION_TEXTS: Record<string, string[]> = {
  "cat-1": TWK_TEXTS,
  "cat-2": TIU_TEXTS,
  "cat-3": TKP_TEXTS,
};

function generatePackageQuestions(
  categoryId: string,
  packageIndex: number,
  count = 50
): PracticeQuestion[] {
  const catSubCats = subCategories.filter((sc) => sc.categoryId === categoryId);
  const texts = CAT_QUESTION_TEXTS[categoryId] || TWK_TEXTS;
  const questions: PracticeQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const seed = packageIndex * 1000 + i;
    const rand = seededRandom(seed);
    const correctIdx = Math.floor(rand * 5);
    const correctKey = OPTION_KEYS[correctIdx];
    const textIdx = i % texts.length;
    const subCat = catSubCats[i % catSubCats.length];
    const optTexts = OPTION_TEXTS[categoryId]?.[textIdx] || [];

    questions.push({
      id: `practice-${categoryId}-pkg${packageIndex}-q${i}`,
      categoryId,
      subCategoryId: subCat?.id ?? "",
      text: `[Paket ${packageIndex + 1} – No. ${i + 1}] ${texts[textIdx]}`,
      options: OPTION_KEYS.map((key, ki) => ({
        key,
        text:
          key === correctKey
            ? `${optTexts[1] || "Jawaban yang paling tepat dan sesuai"}` 
            : optTexts[ki] || `Pilihan ${key} untuk soal ini`,
      })),
      correctAnswer: correctKey,
      explanation: `Pembahasan soal nomor ${i + 1} paket ${packageIndex + 1}: Jawaban yang benar adalah ${correctKey}. ${texts[textIdx]}`,
      difficulty:
        seededRandom(seed + 500) < 0.33
          ? "mudah"
          : seededRandom(seed + 600) < 0.5
          ? "sedang"
          : "sulit",
    });
  }
  return questions;
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const QUESTIONS_PER_PACKAGE = 50;
const PACKAGES_PER_CATEGORY = 3;

const CAT_META: Record<string, { color: string; bgColor: string; borderColor: string; badgeClass: string }> = {
  "cat-1": {
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  "cat-2": {
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  "cat-3": {
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cls =
    difficulty === "mudah"
      ? "bg-green-100 text-green-700"
      : difficulty === "sedang"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  const label =
    difficulty === "mudah" ? "Mudah" : difficulty === "sedang" ? "Sedang" : "Sulit";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
type View = "selection" | "session";

export function PracticePage() {
  const [view, setView] = useState<View>("selection");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [showNav, setShowNav] = useState(true);

  const questions = useMemo(() => {
    if (!selectedCategory) return [];
    return generatePackageQuestions(selectedCategory.id, selectedPackage);
  }, [selectedCategory, selectedPackage]);

  const startPackage = (cat: Category, pkgIdx: number) => {
    setSelectedCategory(cat);
    setSelectedPackage(pkgIdx);
    setCurrentIndex(0);
    setAnswers({});
    setShowAnswers(false);
    setView("session");
  };

  const exitSession = () => {
    setView("selection");
    setSelectedCategory(null);
  };

  /* ── Selection View ── */
  if (view === "selection") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Latihan Soal</h1>
          <p className="text-slate-500 mt-1">
            Pilih kelompok soal dan paket latihan. Setiap paket berisi{" "}
            <span className="font-semibold text-slate-700">{QUESTIONS_PER_PACKAGE} soal</span> tanpa batas waktu.
          </p>
        </div>

        <div className="grid gap-6">
          {categories.map((cat) => {
            const meta = CAT_META[cat.id];
            return (
              <div
                key={cat.id}
                className={`rounded-2xl border ${meta.borderColor} ${meta.bgColor} p-6`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 ${meta.borderColor} bg-white ${meta.color}`}>
                    {cat.code}
                  </div>
                  <div>
                    <h2 className={`font-bold text-lg ${meta.color}`}>{cat.name}</h2>
                    <p className="text-sm text-slate-500">{cat.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Array.from({ length: PACKAGES_PER_CATEGORY }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => startPackage(cat, i)}
                      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-4 text-left group"
                    >
                      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${meta.color}`}>
                        {cat.code}
                      </div>
                      <div className="font-bold text-slate-800 text-base mb-1 group-hover:text-slate-900">
                        Paket {i + 1}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <BookOpen size={14} />
                        {QUESTIONS_PER_PACKAGE} soal · Tanpa timer
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DashboardLayout>
    );
  }

  /* ── Session View ── */
  const q = questions[currentIndex];
  if (!q || !selectedCategory) return null;

  const meta = CAT_META[selectedCategory.id];
  const userAns = answers[q.id];
  const isCorrect = userAns === q.correctAnswer;
  const answeredCount = Object.keys(answers).length;
  const subCat = subCategories.find((sc) => sc.id === q.subCategoryId);

  return (
    <DashboardLayout>
      {/* ── Session Header ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={exitSession}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} /> Kembali
        </button>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${meta.bgColor} ${meta.borderColor} border`}>
          <span className={`font-bold text-sm ${meta.color}`}>{selectedCategory.code}</span>
          <span className="text-slate-400">·</span>
          <span className="text-sm text-slate-600 font-medium">{selectedCategory.name}</span>
          <span className="text-slate-400">·</span>
          <span className="text-sm text-slate-600">Paket {selectedPackage + 1}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {answeredCount}/{QUESTIONS_PER_PACKAGE} dijawab
          </span>

          {/* Toggle show answers */}
          <button
            onClick={() => setShowAnswers((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
              showAnswers
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {showAnswers ? <EyeOff size={15} /> : <Eye size={15} />}
            {showAnswers ? "Sembunyikan Jawaban" : "Tampilkan Jawaban"}
          </button>

          {/* Toggle nav panel */}
          <button
            onClick={() => setShowNav((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-all"
            title="Tampilkan/sembunyikan navigator"
          >
            <LayoutGrid size={15} />
            Navigator
          </button>

          {/* Reset */}
          <button
            onClick={() => { setAnswers({}); setShowAnswers(false); setCurrentIndex(0); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-all"
            title="Ulangi dari awal"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className={`grid gap-5 ${showNav ? "lg:grid-cols-[1fr_220px]" : "grid-cols-1"}`}>
        {/* ── Question Card ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Question header */}
          <div className="px-6 py-3 bg-slate-50 border-b flex items-center gap-3">
            <span className="text-slate-400 text-sm font-medium">
              Soal {currentIndex + 1} dari {QUESTIONS_PER_PACKAGE}
            </span>
            {subCat && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                {subCat.name}
              </span>
            )}
            <DifficultyBadge difficulty={q.difficulty} />
          </div>

          {/* Question text */}
          <div className="px-6 pt-6 pb-4">
            <p className="text-slate-800 font-medium leading-relaxed text-base">{q.text}</p>
          </div>

          {/* Options */}
          <div className="px-6 pb-6 space-y-2.5">
            {q.options.map((opt) => {
              let cls =
                "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer";
              let icon: React.ReactNode = null;

              if (showAnswers) {
                if (opt.key === q.correctAnswer) {
                  cls = "border-emerald-500 bg-emerald-50 cursor-default";
                  icon = <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
                } else if (opt.key === userAns && !isCorrect) {
                  cls = "border-red-400 bg-red-50 cursor-default opacity-80";
                  icon = <XCircle size={18} className="text-red-500 shrink-0" />;
                } else {
                  cls = "border-slate-200 bg-slate-50 opacity-50 cursor-default";
                }
              } else if (userAns === opt.key) {
                cls = "border-primary bg-primary/5 cursor-pointer";
              }

              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (showAnswers) return;
                    setAnswers((prev) => ({ ...prev, [q.id]: opt.key }));
                  }}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${cls}`}
                >
                  <span
                    className={`font-bold shrink-0 mt-0.5 ${
                      showAnswers && opt.key === q.correctAnswer
                        ? "text-emerald-700"
                        : showAnswers && opt.key === userAns && !isCorrect
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    {opt.key}.
                  </span>
                  <span className="flex-1 text-slate-700">{opt.text}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation (shown when answers visible) */}
          {showAnswers && (
            <div className="mx-6 mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="font-bold text-blue-900 text-sm mb-1">Pembahasan</div>
              <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>

            <span className="text-sm text-slate-500 font-medium">
              {currentIndex + 1} / {QUESTIONS_PER_PACKAGE}
            </span>

            <button
              disabled={currentIndex === QUESTIONS_PER_PACKAGE - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Berikutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Navigator Sidebar ── */}
        {showNav && (
          <div className="bg-white rounded-2xl border shadow-sm p-4 h-fit sticky top-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Navigator Soal
            </div>

            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((qs, idx) => {
                const ans = answers[qs.id];
                let btnCls = "text-slate-400 bg-slate-100 hover:bg-slate-200";

                if (showAnswers && ans) {
                  btnCls =
                    ans === qs.correctAnswer
                      ? "bg-emerald-500 text-white"
                      : "bg-red-400 text-white";
                } else if (showAnswers && !ans) {
                  btnCls = "bg-slate-200 text-slate-500";
                } else if (ans) {
                  btnCls = "bg-primary text-white";
                }

                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={qs.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${btnCls} ${
                      isCurrent ? "ring-2 ring-offset-1 ring-primary" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="border-t pt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200" />
                Belum dijawab
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                Sudah dijawab
              </div>
              {showAnswers && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500" />
                    Benar
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-400" />
                    Salah
                  </div>
                </>
              )}
            </div>

            {/* Score summary (when answers shown) */}
            {showAnswers && answeredCount > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Skor Sementara
                </div>
                {(() => {
                  const correct = questions.filter(
                    (qs) => answers[qs.id] === qs.correctAnswer
                  ).length;
                  const pct = Math.round((correct / answeredCount) * 100);
                  return (
                    <div>
                      <div className="text-2xl font-black text-slate-800 mb-1">
                        {correct}
                        <span className="text-sm font-medium text-slate-400">
                          /{answeredCount}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          pct >= 70 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {pct}% benar
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 70 ? "bg-emerald-500" : "bg-red-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
