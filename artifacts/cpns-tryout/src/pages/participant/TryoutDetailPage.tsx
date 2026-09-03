import React, { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
interface Tryout {
  id: string; title: string; description: string; duration: number;
  composition: { TWK: number; TIU: number; TKP: number };
  passingScore: { total: number; TWK: number; TIU: number; TKP: number };
  isAccessibleFree: boolean; hasPremium: boolean; status: string;
}
import { Clock, FileText, Target, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export function TryoutDetailPage() {
  const [match, params] = useRoute("/tryout/:id");
  const [tryout, setTryout] = useState<Tryout | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      if (!params?.id) return;
      try {
        const r = await fetch(`/api/participant/tryouts/${params.id}`, { credentials: "include" });
        if (!r.ok) throw new Error("Not found");
        const data = await r.json();
        setTryout(data.tryout);
      } catch { } finally { setLoading(false); }
    }
    load();
  }, [params?.id]);

  const handleStart = async () => {
    if (!tryout || !user) return;
    setStarting(true);
    setStartError(null);
    try {
      const r = await fetch(`/api/participant/tryouts/${tryout.id}/sessions`, {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Gagal memulai tryout.");
      setLocation(`/tryout/${tryout.id}/start?session=${data.session.id}`);
    } catch (e: any) {
      console.error(e);
      setStartError(e?.message ?? "Gagal memulai tryout. Silakan coba lagi.");
      setStarting(false);
    }
  };

  if (loading || !tryout) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalSoal = tryout.composition.TWK + tryout.composition.TIU + tryout.composition.TKP;
  const isLocked  = !tryout.isAccessibleFree && !tryout.hasPremium;

  return (
    <DashboardLayout>
      <button 
        onClick={() => setLocation('/tryout')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Daftar
      </button>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-8 md:p-12 border-b">
          <div className="max-w-3xl">
            {tryout.isAccessibleFree ? (
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full tracking-wider mb-4">GRATIS</span>
            ) : (
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full tracking-wider mb-4">PREMIUM</span>
            )}
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">{tryout.title}</h1>
            <p className="text-lg text-slate-600 mb-8">{tryout.description}</p>

            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Durasi Pengerjaan</div>
                  <div className="text-xl font-bold text-slate-900">{tryout.duration} Menit</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Total Soal</div>
                  <div className="text-xl font-bold text-slate-900">{totalSoal} Butir</div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Perhatian:</strong> Tryout tidak dapat dijeda (pause) setelah dimulai. Pastikan koneksi internet stabil dan siapkan kertas coretan jika diperlukan.
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 bg-slate-50 grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Komposisi Soal & Passing Grade</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border shadow-sm">
                <div>
                  <div className="font-bold text-slate-900">TWK</div>
                  <div className="text-sm text-slate-500">Tes Wawasan Kebangsaan</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{tryout.composition.TWK} Soal</div>
                  <div className="text-sm text-slate-500">Passing Grade: {tryout.passingScore.TWK}</div>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border shadow-sm">
                <div>
                  <div className="font-bold text-slate-900">TIU</div>
                  <div className="text-sm text-slate-500">Tes Intelegensia Umum</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{tryout.composition.TIU} Soal</div>
                  <div className="text-sm text-slate-500">Passing Grade: {tryout.passingScore.TIU}</div>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border shadow-sm">
                <div>
                  <div className="font-bold text-slate-900">TKP</div>
                  <div className="text-sm text-slate-500">Tes Karakteristik Pribadi</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{tryout.composition.TKP} Soal</div>
                  <div className="text-sm text-slate-500">Passing Grade: {tryout.passingScore.TKP}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-end">
            {startError && (
              <div className="mb-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {startError}
              </div>
            )}
            {isLocked ? (
              <Link
                href="/subscription"
                className="w-full h-14 rounded-xl bg-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-300 transition-all flex items-center justify-center gap-2"
              >
                <Lock size={20} /> Buka dengan Premium
              </Link>
            ) : (
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full h-14 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {starting ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  "Kerjakan Sekarang"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
