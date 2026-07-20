import * as data from "../data/dummy-cpns-data";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface DashboardSummary {
  totalTryoutsDone: number;
  averageScore: number;
  rank: number;
  subscriptionName: string | null;
  subscriptionDaysLeft: number;
  scoreHistory: { tryout: string; score: number }[];
}

export interface SubscriptionInfo extends data.Subscription {
  daysLeft: number;
}

export interface CheckoutInfo {
  paymentId: string;
  invoiceNo: string;
  amount: number;
}

export interface CouponValidation {
  valid: boolean;
  discount: number;
  message: string;
}

export interface RankingEntry {
  rank: number;
  userId: string;
  userName: string;
  total: number;
  TWK: number;
  TIU: number;
  TKP: number;
  date: string;
}

export interface AdminReports {
  totalRevenue: number;
  monthlyRevenue: { month: string; amount: number }[];
  newUsers: { month: string; count: number }[];
  popularTryouts: { id: string; title: string; count: number }[];
}

export interface CmsContent {
  hero: { headline: string; subheadline: string };
  faq: { question: string; answer: string }[];
}

export const dummyApi = {
  // Auth
  login: async (email: string, password: string): Promise<data.User> => {
    await delay(500);
    const user = data.users.find(u => u.email === email) || data.users[1];
    return user;
  },
  logout: async (): Promise<void> => {
    await delay(300);
  },
  getCurrentUser: async (): Promise<data.User> => {
    await delay(200);
    return data.users[1]; // Simulate logged in as participant
  },
  getAdminUser: async (): Promise<data.User> => {
    await delay(200);
    return data.users[0]; // Admin
  },

  // Dashboard
  getDashboardSummary: async (userId: string): Promise<DashboardSummary> => {
    await delay(400);
    const userResults = data.results.filter(r => r.userId === userId);
    return {
      totalTryoutsDone: userResults.length,
      averageScore: userResults.reduce((acc, curr) => acc + curr.score.total, 0) / (userResults.length || 1),
      rank: 15,
      subscriptionName: "Gold",
      subscriptionDaysLeft: 45,
      scoreHistory: userResults.map(r => ({ tryout: data.tryouts.find(t => t.id === r.tryoutId)?.title || "Tryout", score: r.score.total }))
    };
  },
  getAnnouncements: async (): Promise<data.Announcement[]> => {
    await delay(300);
    return data.announcements;
  },

  // Tryout
  getTryouts: async (filter?: data.TryoutStatus): Promise<data.Tryout[]> => {
    await delay(400);
    if (filter) return data.tryouts.filter(t => t.status === filter);
    return data.tryouts;
  },
  getTryoutById: async (id: string): Promise<data.Tryout> => {
    await delay(300);
    const tryout = data.tryouts.find(t => t.id === id);
    if (!tryout) throw new Error("Not found");
    return tryout;
  },
  startTryout: async (tryoutId: string, userId: string): Promise<data.TryoutSession> => {
    await delay(500);
    const newSession: data.TryoutSession = {
      id: `ses-${Math.random()}`,
      userId,
      tryoutId,
      answers: {},
      flagged: [],
      startTime: new Date().toISOString(),
      endTime: null,
      status: "in_progress"
    };
    return newSession;
  },
  saveAnswer: async (sessionId: string, questionId: string, answer: string): Promise<void> => {
    await delay(100);
  },
  toggleFlag: async (sessionId: string, questionId: string): Promise<void> => {
    await delay(100);
  },
  submitTryout: async (sessionId: string): Promise<data.Result> => {
    await delay(600);
    return data.results[0];
  },
  getSession: async (sessionId: string): Promise<data.TryoutSession> => {
    await delay(300);
    return data.sessions.find(s => s.id === sessionId) || data.sessions[0];
  },

  // Results
  getResults: async (userId: string): Promise<data.Result[]> => {
    await delay(400);
    return data.results.filter(r => r.userId === userId);
  },
  getResultById: async (resultId: string): Promise<data.Result> => {
    await delay(300);
    return data.results.find(r => r.id === resultId) || data.results[0];
  },
  getRanking: async (tryoutId?: string): Promise<RankingEntry[]> => {
    await delay(500);
    return [
      { rank: 1, userId: "usr-2", userName: "Siti Aminah", total: 420, TWK: 120, TIU: 130, TKP: 170, date: "2023-10-01" },
      { rank: 2, userId: "usr-3", userName: "Andi Wijaya", total: 400, TWK: 110, TIU: 120, TKP: 170, date: "2023-10-01" },
      { rank: 15, userId: "usr-1", userName: "Budi Santoso", total: 360, TWK: 80, TIU: 100, TKP: 180, date: "2023-10-01" }
    ];
  },

  // Questions
  getQuestions: async (filter?: { categoryId?: string; subCategoryId?: string; difficulty?: string }): Promise<data.Question[]> => {
    await delay(400);
    let filtered = data.questions;
    if (filter?.categoryId) filtered = filtered.filter(q => q.categoryId === filter.categoryId);
    if (filter?.subCategoryId) filtered = filtered.filter(q => q.subCategoryId === filter.subCategoryId);
    if (filter?.difficulty) filtered = filtered.filter(q => q.difficulty === filter.difficulty);
    return filtered;
  },
  getCategories: async (): Promise<data.Category[]> => {
    await delay(200);
    return data.categories;
  },
  getSubCategories: async (categoryId?: string): Promise<data.SubCategory[]> => {
    await delay(200);
    if (categoryId) return data.subCategories.filter(sc => sc.categoryId === categoryId);
    return data.subCategories;
  },
  toggleFavorite: async (questionId: string): Promise<void> => {
    await delay(200);
  },
  getFavoriteQuestions: async (userId: string): Promise<data.Question[]> => {
    await delay(300);
    return data.questions.filter(q => q.isFavorite);
  },

  // Subscription
  getSubscriptions: async (): Promise<data.Subscription[]> => {
    await delay(300);
    return data.subscriptions;
  },
  getUserSubscription: async (userId: string): Promise<SubscriptionInfo | null> => {
    await delay(300);
    const user = data.users.find(u => u.id === userId);
    if (!user || !user.subscriptionId) return null;
    const sub = data.subscriptions.find(s => s.id === user.subscriptionId);
    if (!sub) return null;
    return { ...sub, daysLeft: 45 };
  },
  createCheckout: async (subscriptionId: string, couponCode?: string): Promise<CheckoutInfo> => {
    await delay(500);
    return { paymentId: `pay-${Date.now()}`, invoiceNo: `INV/${Date.now()}`, amount: 199000 };
  },
  validateCoupon: async (code: string, subscriptionId: string): Promise<CouponValidation> => {
    await delay(300);
    const coupon = data.coupons.find(c => c.code === code && c.isActive);
    if (!coupon) return { valid: false, discount: 0, message: "Kupon tidak valid" };
    return { valid: true, discount: coupon.discountType === "nominal" ? coupon.discountValue : 20000, message: "Kupon berhasil diterapkan" };
  },

  // Payment
  getPayments: async (userId: string): Promise<data.Payment[]> => {
    await delay(300);
    return data.payments.filter(p => p.userId === userId);
  },
  getPaymentById: async (id: string): Promise<data.Payment> => {
    await delay(200);
    return data.payments.find(p => p.id === id) || data.payments[0];
  },

  // Profile
  updateProfile: async (userId: string, updates: Partial<data.User>): Promise<data.User> => {
    await delay(400);
    return { ...data.users[1], ...updates };
  },

  // Admin Methods
  adminGetUsers: async (): Promise<data.User[]> => { await delay(400); return data.users; },
  adminUpdateUser: async (id: string, updates: Partial<data.User>): Promise<data.User> => { await delay(300); return data.users[1]; },
  
  adminGetQuestions: async (): Promise<data.Question[]> => { await delay(400); return data.questions; },
  adminCreateQuestion: async (q: Omit<data.Question, 'id'>): Promise<data.Question> => { await delay(400); return { ...q, id: `q-${Date.now()}` }; },
  adminUpdateQuestion: async (id: string, q: Partial<data.Question>): Promise<data.Question> => { await delay(400); return data.questions[0]; },
  adminDeleteQuestion: async (id: string): Promise<void> => { await delay(300); },

  adminGetTryouts: async (): Promise<data.Tryout[]> => { await delay(300); return data.tryouts; },
  adminCreateTryout: async (t: Omit<data.Tryout, 'id'>): Promise<data.Tryout> => { await delay(400); return { ...t, id: `to-${Date.now()}` }; },
  adminUpdateTryout: async (id: string, t: Partial<data.Tryout>): Promise<data.Tryout> => { await delay(400); return data.tryouts[0]; },
  adminDeleteTryout: async (id: string): Promise<void> => { await delay(300); },

  adminGetSubscriptions: async (): Promise<data.Subscription[]> => { await delay(200); return data.subscriptions; },
  adminGetPayments: async (): Promise<data.Payment[]> => { await delay(300); return data.payments; },
  
  adminGetCoupons: async (): Promise<data.Coupon[]> => { await delay(200); return data.coupons; },
  adminCreateCoupon: async (c: Omit<data.Coupon, 'id' | 'usedCount'>): Promise<data.Coupon> => { await delay(400); return { ...c, id: `c-${Date.now()}`, usedCount: 0 }; },
  adminUpdateCoupon: async (id: string, c: Partial<data.Coupon>): Promise<data.Coupon> => { await delay(400); return data.coupons[0]; },
  adminDeleteCoupon: async (id: string): Promise<void> => { await delay(300); },

  adminGetReports: async (): Promise<AdminReports> => {
    await delay(500);
    return {
      totalRevenue: 15500000,
      monthlyRevenue: [{ month: "Jan", amount: 2000000 }, { month: "Feb", amount: 3500000 }, { month: "Mar", amount: 10000000 }],
      newUsers: [{ month: "Jan", count: 120 }, { month: "Feb", count: 250 }, { month: "Mar", count: 500 }],
      popularTryouts: [{ id: "to-1", title: "Tryout Akbar 1", count: 1200 }, { id: "to-2", title: "Premium HOTS", count: 400 }]
    };
  },

  adminGetCmsContent: async (): Promise<CmsContent> => {
    await delay(300);
    return {
      hero: { headline: "Lulus CPNS 2024 Bersama Kami", subheadline: "Platform tryout dengan simulasi CAT paling mirip aslinya." },
      faq: [{ question: "Apakah ada garansi lulus?", answer: "Tidak ada garansi, namun kami berikan materi terbaik." }]
    };
  },
  adminUpdateCmsContent: async (section: string, updates: any): Promise<void> => {
    await delay(400);
  }
};
