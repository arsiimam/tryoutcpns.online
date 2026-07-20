export type UserRole = "peserta" | "admin";
export type SubStatus = "active" | "expired" | "none";
export type PaymentStatus = "pending" | "success" | "failed" | "expired" | "cancelled";
export type TryoutStatus = "published" | "draft";
export type SessionStatus = "in_progress" | "completed" | "submitted";
export type Difficulty = "mudah" | "sedang" | "sulit";

export interface User {
  id: string; name: string; email: string; role: UserRole;
  status: "active" | "inactive"; subscriptionId: string | null;
  avatar: string; createdAt: string;
}
export interface Subscription {
  id: string; name: string; price: number; originalPrice: number;
  duration: number; // days
  benefits: string[]; maxTryouts: number; isActive: boolean;
  color: string; // for UI: "blue" | "gold" | "emerald"
}
export interface Payment {
  id: string; userId: string; subscriptionId: string;
  amount: number; status: PaymentStatus; method: string;
  reference: string; invoiceNo: string; createdAt: string; expiredAt: string;
}
export interface Category {
  id: string; name: string; code: "TWK" | "TIU" | "TKP"; description: string;
}
export interface SubCategory {
  id: string; categoryId: string; name: string;
}
export interface Question {
  id: string; categoryId: string; subCategoryId: string;
  text: string; options: { key: string; text: string }[];
  correctAnswer: string; explanation: string;
  difficulty: Difficulty; isFavorite?: boolean;
}
export interface Tryout {
  id: string; title: string; description: string;
  duration: number; // minutes
  passingScore: { TWK: number; TIU: number; TKP: number; total: number };
  composition: { TWK: number; TIU: number; TKP: number };
  status: TryoutStatus; schedule: string | null;
  isAccessibleFree: boolean;
}
export interface TryoutSession {
  id: string; userId: string; tryoutId: string;
  answers: Record<string, string>; // questionId -> selectedOption
  flagged: string[]; // questionIds
  startTime: string; endTime: string | null; status: SessionStatus;
}
export interface Result {
  id: string; sessionId: string; userId: string; tryoutId: string;
  score: { TWK: number; TIU: number; TKP: number; total: number };
  passed: boolean; rank: number; totalParticipants: number;
  completedAt: string;
}
export interface Coupon {
  id: string; code: string;
  discountType: "percentage" | "nominal";
  discountValue: number; minPurchase: number; maxDiscount: number;
  validFrom: string; validUntil: string;
  quota: number; usedCount: number;
  applicableSubscriptions: string[]; forNewUserOnly: boolean; isActive: boolean;
}
export interface Announcement {
  id: string; title: string; content: string;
  isImportant: boolean; createdAt: string;
}

export const subscriptions: Subscription[] = [
  { id: "sub-1", name: "Gratis", price: 0, originalPrice: 0, duration: 365, benefits: ["Akses 1 Tryout Gratis", "Pembahasan Dasar"], maxTryouts: 1, isActive: true, color: "slate" },
  { id: "sub-2", name: "Silver", price: 99000, originalPrice: 149000, duration: 30, benefits: ["Akses Semua Tryout (1 Bulan)", "Pembahasan Lengkap", "Analisis Skor", "Latihan Soal Bebas"], maxTryouts: 999, isActive: true, color: "blue" },
  { id: "sub-3", name: "Gold", price: 199000, originalPrice: 349000, duration: 90, benefits: ["Akses Semua Tryout (3 Bulan)", "Pembahasan Lengkap & Video", "Analisis Skor Detail", "Latihan Soal Bebas", "Grup Diskusi Telegram"], maxTryouts: 999, isActive: true, color: "gold" }
];

export const users: User[] = [
  { id: "usr-admin", name: "Admin SiapCPNS", email: "admin@siapcpns.id", role: "admin", status: "active", subscriptionId: null, avatar: "AS", createdAt: "2023-01-01T00:00:00Z" },
  { id: "usr-1", name: "Budi Santoso", email: "budi@example.com", role: "peserta", status: "active", subscriptionId: "sub-3", avatar: "BS", createdAt: "2023-06-15T08:30:00Z" },
  { id: "usr-2", name: "Siti Aminah", email: "siti@example.com", role: "peserta", status: "active", subscriptionId: "sub-2", avatar: "SA", createdAt: "2023-07-20T10:15:00Z" },
  { id: "usr-3", name: "Andi Wijaya", email: "andi@example.com", role: "peserta", status: "active", subscriptionId: "sub-1", avatar: "AW", createdAt: "2023-08-05T14:45:00Z" },
  { id: "usr-4", name: "Rina Kumala", email: "rina@example.com", role: "peserta", status: "inactive", subscriptionId: null, avatar: "RK", createdAt: "2023-09-10T09:00:00Z" }
];

export const categories: Category[] = [
  { id: "cat-1", name: "Tes Wawasan Kebangsaan", code: "TWK", description: "Menguji penguasaan pengetahuan dan kemampuan mengimplementasikan nilai-nilai 4 Pilar Kebangsaan Indonesia." },
  { id: "cat-2", name: "Tes Intelegensia Umum", code: "TIU", description: "Menguji kecakapan logika, verbal, numerik, dan figural." },
  { id: "cat-3", name: "Tes Karakteristik Pribadi", code: "TKP", description: "Menguji karakteristik dan kepribadian dalam berbagai situasi kerja." }
];

export const subCategories: SubCategory[] = [
  { id: "subcat-1", categoryId: "cat-1", name: "Pancasila" },
  { id: "subcat-2", categoryId: "cat-1", name: "UUD 1945" },
  { id: "subcat-3", categoryId: "cat-1", name: "Nasionalisme" },
  { id: "subcat-4", categoryId: "cat-2", name: "Numerik" },
  { id: "subcat-5", categoryId: "cat-2", name: "Analogi" },
  { id: "subcat-6", categoryId: "cat-2", name: "Silogisme" },
  { id: "subcat-7", categoryId: "cat-3", name: "Integritas" },
  { id: "subcat-8", categoryId: "cat-3", name: "Pelayanan Publik" },
  { id: "subcat-9", categoryId: "cat-3", name: "Kerjasama" }
];

export const tryouts: Tryout[] = [
  { id: "to-1", title: "Tryout Akbar CPNS 2024 #1", description: "Simulasi Nasional dengan standar BKN terbaru.", duration: 100, passingScore: { TWK: 65, TIU: 80, TKP: 166, total: 311 }, composition: { TWK: 30, TIU: 35, TKP: 45 }, status: "published", schedule: "2024-05-01T08:00:00Z", isAccessibleFree: true },
  { id: "to-2", title: "Tryout Premium HOTS #1", description: "Latihan soal High Order Thinking Skills.", duration: 100, passingScore: { TWK: 65, TIU: 80, TKP: 166, total: 311 }, composition: { TWK: 30, TIU: 35, TKP: 45 }, status: "published", schedule: null, isAccessibleFree: false },
  { id: "to-3", title: "Tryout Premium HOTS #2", description: "Persiapan mental ujian sesungguhnya.", duration: 100, passingScore: { TWK: 65, TIU: 80, TKP: 166, total: 311 }, composition: { TWK: 30, TIU: 35, TKP: 45 }, status: "published", schedule: null, isAccessibleFree: false },
  { id: "to-4", title: "Tryout SKD Khusus Kedinasan", description: "Untuk persiapan sekolah kedinasan.", duration: 100, passingScore: { TWK: 65, TIU: 80, TKP: 156, total: 301 }, composition: { TWK: 30, TIU: 35, TKP: 45 }, status: "draft", schedule: null, isAccessibleFree: false },
  { id: "to-5", title: "Tryout Kejutan Akhir Pekan", description: "Uji kemampuan di akhir pekan.", duration: 100, passingScore: { TWK: 65, TIU: 80, TKP: 166, total: 311 }, composition: { TWK: 30, TIU: 35, TKP: 45 }, status: "draft", schedule: null, isAccessibleFree: true }
];

export const questions: Question[] = [];
const generateOptions = (correct: string) => [
  { key: "A", text: `Opsi A (Dummy ${Math.random().toString(36).substring(7)})` },
  { key: "B", text: `Opsi B (Dummy ${Math.random().toString(36).substring(7)})` },
  { key: "C", text: `Opsi C (Dummy ${Math.random().toString(36).substring(7)})` },
  { key: "D", text: `Opsi D (Dummy ${Math.random().toString(36).substring(7)})` },
  { key: "E", text: `Opsi E (Dummy ${Math.random().toString(36).substring(7)})` }
].map(opt => opt.key === correct ? { key: opt.key, text: `Ini Jawaban Benar` } : opt);

for (let i = 1; i <= 30; i++) {
  const isTwk = i <= 10;
  const isTiu = i > 10 && i <= 20;
  
  const categoryId = isTwk ? "cat-1" : isTiu ? "cat-2" : "cat-3";
  const subCats = subCategories.filter(sc => sc.categoryId === categoryId);
  const subCategoryId = subCats[i % subCats.length].id;
  const correct = ["A", "B", "C", "D", "E"][Math.floor(Math.random() * 5)];
  
  questions.push({
    id: `q-${i}`,
    categoryId,
    subCategoryId,
    text: `Contoh soal nomor ${i}. Berdasarkan materi pada ${categoryId}, manakah pernyataan yang paling tepat?`,
    options: generateOptions(correct),
    correctAnswer: correct,
    explanation: `Pembahasan untuk soal nomor ${i}. Jawaban yang tepat adalah ${correct} karena alasan tertentu yang logis dan sesuai materi.`,
    difficulty: i % 3 === 0 ? "sulit" : i % 2 === 0 ? "sedang" : "mudah",
    isFavorite: i % 5 === 0
  });
}

export const sessions: TryoutSession[] = [
  { id: "ses-1", userId: "usr-1", tryoutId: "to-1", answers: { "q-1": "A", "q-2": "B", "q-3": "C" }, flagged: ["q-2"], startTime: "2023-10-01T08:00:00Z", endTime: "2023-10-01T09:40:00Z", status: "submitted" },
  { id: "ses-2", userId: "usr-1", tryoutId: "to-2", answers: { "q-11": "D", "q-12": "E" }, flagged: [], startTime: "2023-10-15T10:00:00Z", endTime: null, status: "in_progress" }
];

export const results: Result[] = [
  { id: "res-1", sessionId: "ses-1", userId: "usr-1", tryoutId: "to-1", score: { TWK: 80, TIU: 100, TKP: 180, total: 360 }, passed: true, rank: 15, totalParticipants: 1500, completedAt: "2023-10-01T09:40:00Z" }
];

export const payments: Payment[] = [
  { id: "pay-1", userId: "usr-1", subscriptionId: "sub-3", amount: 199000, status: "success", method: "BCA Virtual Account", reference: "REF-12345", invoiceNo: "INV/2023/10/01", createdAt: "2023-10-01T07:00:00Z", expiredAt: "2023-10-02T07:00:00Z" },
  { id: "pay-2", userId: "usr-2", subscriptionId: "sub-2", amount: 99000, status: "success", method: "QRIS", reference: "REF-12346", invoiceNo: "INV/2023/10/05", createdAt: "2023-10-05T09:00:00Z", expiredAt: "2023-10-06T09:00:00Z" },
  { id: "pay-3", userId: "usr-3", subscriptionId: "sub-2", amount: 99000, status: "pending", method: "Mandiri Virtual Account", reference: "REF-12347", invoiceNo: "INV/2023/10/20", createdAt: "2023-10-20T14:00:00Z", expiredAt: "2023-10-21T14:00:00Z" }
];

export const coupons: Coupon[] = [
  { id: "coup-1", code: "LULUSCPNS", discountType: "percentage", discountValue: 20, minPurchase: 100000, maxDiscount: 50000, validFrom: "2023-01-01T00:00:00Z", validUntil: "2023-12-31T23:59:59Z", quota: 100, usedCount: 45, applicableSubscriptions: ["sub-2", "sub-3"], forNewUserOnly: false, isActive: true },
  { id: "coup-2", code: "NEWUSER50", discountType: "nominal", discountValue: 50000, minPurchase: 150000, maxDiscount: 50000, validFrom: "2023-01-01T00:00:00Z", validUntil: "2023-12-31T23:59:59Z", quota: 500, usedCount: 120, applicableSubscriptions: ["sub-3"], forNewUserOnly: true, isActive: true }
];

export const announcements: Announcement[] = [
  { id: "ann-1", title: "Jadwal Pendaftaran CPNS 2024 Dibuka!", content: "Siapkan berkas-berkas Anda. Pendaftaran akan dibuka mulai 1 Mei 2024 melalui portal SSCASN.", isImportant: true, createdAt: "2024-04-15T00:00:00Z" },
  { id: "ann-2", title: "Tryout Akbar Nasional #2 Segera Hadir", content: "Jangan lewatkan kesempatan untuk mengukur kemampuan dengan puluhan ribu peserta lainnya.", isImportant: false, createdAt: "2024-04-20T00:00:00Z" }
];
