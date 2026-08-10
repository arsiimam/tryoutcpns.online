import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
import { BookOpen, CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";

interface BundleHistory {
  sessionId: string;
  bundleId: number;
  bundleName: string;
  bundleDescription: string;
  bundleCategory: string;
  questionCount: number;
  totalQuestions: number;
  correctCount: number;
  completedAt: string;
  sessionCount: number;
}

const CAT_COLORS: Record<string, string> = {
  TWK: "bg-blue-100 text-blue-800",
  TIU: "bg-purple-100 text-purple-800",
  TKP: "bg-emerald-100 text-emerald-800",
  SKD: "bg-indigo-100 text-indigo-800",
  SKB: "bg-rose-100 text-rose-800",
};

export function ReviewPage() {
  const [history, setHistory] = useState<BundleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/participant/practice/history", { credentials: "include" });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `Gagal memuat (${r.status})`);
        setHistory(data.history ?? []);
      } catch (err: any) {
        setError(err.message ?? "Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-red-500 font-semibold">{error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90">
            Coba Lagi
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Review Latihan Soal"
        description="Pelajari kembali jawaban Anda dari latihan soal yang telah dikerjakan."
      />

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border text-center">
          <ClipboardList size={48} className="text-slate-300 mb-4" />
          <p className="font-semibold text-slate-700 text-lg">Belum ada latihan yang selesai</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            Kerjakan latihan soal terlebih dahulu, lalu kembali ke sini untuk mereview jawaban Anda.
          </p>
          <button
            onClick={() => navigate("/latihan")}
            className="mt-5 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Mulai Latihan
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {history.map((h) => {
            const pct = h.totalQuestions > 0
              ? Math.round((h.correctCount / h.totalQuestions) * 100)
              : 0;
            const catKey = h.bundleCategory?.toUpperCase() ?? "";
            const badgeCls = CAT_COLORS[catKey] ?? "bg-slate-100 text-slate-700";

            return (
              <button
                key={h.bundleId}
                onClick={() => navigate(`/review/${h.bundleId}`)}
                className="bg-white rounded-2xl border shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeCls}`}>
                    {h.bundleCategory || "Lainnya"}
                  </span>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors mt-0.5" />
                </div>

                <div className="font-bold text-slate-900 text-base mb-1 leading-snug line-clamp-2">
                  {h.bundleName}
                </div>

                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <CheckCircle2 size={15} />
                    {h.correctCount}/{h.totalQuestions} benar
                  </div>
                  <div className="text-slate-400">·</div>
                  <div className={`font-bold ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {pct}%
                  </div>
                </div>

                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Terakhir: {new Date(h.completedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                  {(h.sessionCount ?? 1) > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                      {h.sessionCount} sesi
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
