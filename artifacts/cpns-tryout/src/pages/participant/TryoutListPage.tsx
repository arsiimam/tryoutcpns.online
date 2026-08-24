import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
import { Link, useLocation } from "wouter";
import { Clock, FileText, Target, PlayCircle, Lock, RotateCcw, CheckCircle2, XCircle, X, Trophy, ArrowRight } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

interface LastResult {
  sessionId: string | null;
  totalScore: number;
  twkScore: number | null;
  tiuScore: number | null;
  tkpScore: number | null;
  passed: boolean;
  rank: number;
  totalParticipants: number;
  completedAt: string;
}

interface Tryout {
  id: string; title: string; description: string; duration: number;
  totalQuestions: number;
  composition: { TWK: number; TIU: number; TKP: number };
  passingScore: { total: number; TWK: number; TIU: number; TKP: number };
  isAccessibleFree: boolean; hasPremium: boolean; status: string; schedule?: string;
  lastResult: LastResult | null;
}

type Filter = "semua" | "belum" | "sudah" | "lulus" | "tidak_lulus";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "semua",      label: "Semua" },
  { key: "belum",      label: "Belum Dikerjakan" },
  { key: "sudah",      label: "Sudah Dikerjakan" },
  { key: "lulus",      label: "Lulus" },
  { key: "tidak_lulus",label: "Belum Lulus" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function TryoutListPage() {
  const [tryouts,    setTryouts]    = useState<Tryout[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<Filter>("semua");
  const [confirm,    setConfirm]    = useState<Tryout | null>(null);
  const [restarting, setRestarting] = useState(false);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/participant/tryouts`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setTryouts(d.tryouts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const hasPremium = tryouts.length > 0 ? tryouts[0].hasPremium : !!(
    user?.subscription?.status === "active" &&
    new Date(user?.subscription?.expiresAt ?? 0) > new Date()
  );

  /* ── Filter logic ── */
  const filtered = tryouts.filter(to => {
    if (filter === "semua")       return true;
    if (filter === "belum")       return !to.lastResult;
    if (filter === "sudah")       return !!to.lastResult;
    if (filter === "lulus")       return !!to.lastResult?.passed;
    if (filter === "tidak_lulus") return !!to.lastResult && !to.lastResult.passed;
    return true;
  });

  /* ── Ulangi tryout ── */
  const handleRestart = async () => {
    if (!confirm) return;
    setRestarting(true);
    try {
      const r = await fetch(`${BASE}/api/participant/tryouts/${confirm.id}/sessions`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const d = await r.json();
      if (r.ok && d.session?.id) { setConfirm(null); setLocation(`/tryout/${confirm.id}`); }
    } catch {}
    finally { setRestarting(false); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Daftar Tryout CAT"
        description="Pilih tryout dan simulasikan ujian sesungguhnya dengan timer."
      />

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.key
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            {f.label}
            {f.key !== "semua" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({tryouts.filter(to => {
                  if (f.key === "belum")       return !to.lastResult;
                  if (f.key === "sudah")       return !!to.lastResult;
                  if (f.key === "lulus")       return !!to.lastResult?.passed;
                  if (f.key === "tidak_lulus") return !!to.lastResult && !to.lastResult.passed;
                  return true;
                }).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada tryout dengan filter ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((to) => {
            const isLocked  = !to.isAccessibleFree && !hasPremium;
            const totalSoal = to.totalQuestions || (to.composition.TWK + to.composition.TIU + to.composition.TKP);
            const hasResult = !!to.lastResult;

            return (
              <div key={to.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div
                  className="p-6 border-b flex-1 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setLocation(isLocked ? "/subscription" : `/tryout/${to.id}`)}>


                  {/* Badge baris */}
                  <div className="flex justify-between items-start mb-4">
                    {to.isAccessibleFree ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full tracking-wider">GRATIS</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full tracking-wider flex items-center gap-1">
                        {/* Tampilkan kunci hanya jika user belum premium */}
                        {!hasPremium && <Lock size={10} />}
                        PREMIUM
                      </span>
                    )}
                    {to.schedule && (
                      <span className="text-xs font-medium text-slate-500">
                        {new Date(to.schedule).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{to.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{to.description}</p>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={15} className="text-slate-400" />
                      <span>{to.duration} Menit</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText size={15} className="text-slate-400" />
                      <span>{totalSoal} Soal</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                      <Target size={15} className="text-slate-400" />
                      <span>Passing Grade: {to.passingScore.total}</span>
                    </div>
                  </div>

                  {/* Score + ranking terakhir */}
                  {hasResult && to.lastResult && (
                    <div className={`rounded-xl px-3 py-2.5 space-y-2 ${to.lastResult.passed
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-red-50 border border-red-200"}`}>
                      {/* Baris 1: skor & status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm flex-wrap">
                          {to.lastResult.passed
                            ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            : <XCircle size={14} className="text-red-500 shrink-0" />}
                          <span className="font-bold text-slate-800">{to.lastResult.totalScore}</span>
                          {to.lastResult.twkScore != null && <span className="text-slate-500 text-xs">TWK {to.lastResult.twkScore}</span>}
                          {to.lastResult.tiuScore != null && <span className="text-slate-500 text-xs">TIU {to.lastResult.tiuScore}</span>}
                          {to.lastResult.tkpScore != null && <span className="text-slate-500 text-xs">TKP {to.lastResult.tkpScore}</span>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${to.lastResult.passed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-600"}`}>
                          {to.lastResult.passed ? "LULUS" : "BELUM LULUS"}
                        </span>
                      </div>
                      {/* Baris 2: ranking nasional */}
                      {to.lastResult.rank > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Trophy size={12} className="text-amber-500 shrink-0" />
                          <span>
                            Peringkat <span className="font-bold text-slate-800">#{to.lastResult.rank}</span>
                            {" "}dari{" "}
                            <span className="font-bold text-slate-800">{to.lastResult.totalParticipants.toLocaleString("id-ID")}</span>
                            {" "}peserta
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="p-4 bg-slate-50 flex flex-col gap-2">
                  {isLocked ? (
                    <Link href="/subscription" className="w-full flex items-center justify-center gap-2 h-10 rounded-lg font-semibold text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors">
                      <Lock size={16} /> Buka dengan Premium
                    </Link>
                  ) : (
                    <>
                      <Link href={`/tryout/${to.id}`} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg font-semibold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md">
                        <PlayCircle size={16} /> {hasResult ? "Lihat / Lanjut" : "Mulai Tryout"}
                      </Link>
                      {hasResult && to.lastResult?.sessionId && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLocation(`/tryout/${to.lastResult!.sessionId}/review`)}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors">
                            Review Soal
                          </button>
                          <button
                            onClick={() => setLocation(`/tryout/${to.id}/result?session=${to.lastResult!.sessionId}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors">
                            Detail <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                      {hasResult && (
                        <button
                          onClick={() => setConfirm(to)}
                          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors">
                          <RotateCcw size={14} /> Ulangi Tryout
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Konfirmasi Ulangi ── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw size={18} className="text-amber-600" />
              </div>
              <button onClick={() => setConfirm(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Ulangi Tryout?</h3>
            <p className="text-sm font-medium text-slate-700 mb-1">{confirm.title}</p>
            <p className="text-sm text-slate-500 mb-5">
              Sesi baru akan dimulai dari awal. Hasil sebelumnya tetap tersimpan di riwayat.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 h-10 rounded-xl border text-sm font-medium text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleRestart} disabled={restarting}
                className="flex-1 h-10 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-1.5">
                {restarting ? "Memulai..." : <><RotateCcw size={14} /> Ya, Ulangi</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
