import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

interface Result {
  id: string; sessionId: string; tryoutId: string; tryoutName?: string;
  score: { TWK: number; TIU: number; TKP: number; total: number };
  passed: boolean; rank: number; totalParticipants: number; completedAt: string;
}
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { CheckCircle2, XCircle, Trophy, Target, ArrowRight, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const DEFAULT_PG = { TWK: 65, TIU: 80, TKP: 166 };

export function ResultPage() {
  const [match, params] = useRoute("/tryout/:id/result");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [pg, setPg] = useState(DEFAULT_PG);
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session');

  useEffect(() => {
    fetch("/api/participant/passing-grades", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.grades) setPg({ ...DEFAULT_PG, ...d.grades }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      if (!sessionId) { setLoading(false); return; }
      try {
        const [resultRes, pgRes] = await Promise.all([
          fetch(`/api/participant/results/${sessionId}`, { credentials: "include" }),
          fetch("/api/participant/settings/passing-grades", { credentials: "include" }),
        ]);
        if (!resultRes.ok) throw new Error("Result not found");
        const data = await resultRes.json();
        setResult(data.result);
        if (pgRes.ok) {
          const pgData = await pgRes.json();
          if (pgData.grades) setPg({ ...DEFAULT_PG, ...pgData.grades });
        }
      } catch { } finally { setLoading(false); }
    }
    load();
  }, [sessionId]);

  if (loading || !result) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const chartData = [
    { name: 'TWK', score: result.score.TWK, passing: pg.TWK, full: 150 },
    { name: 'TIU', score: result.score.TIU, passing: pg.TIU, full: 175 },
    { name: 'TKP', score: result.score.TKP, passing: pg.TKP, full: 225 },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner Lulus/Tidak */}
        <div className={`p-8 md:p-10 rounded-2xl flex flex-col md:flex-row items-center gap-8 justify-between text-white shadow-xl ${
          result.passed ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-white/20 shrink-0`}>
              {result.passed ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
            </div>
            <div>
              <div className="text-white/80 font-bold uppercase tracking-wider text-sm mb-1">Status Kelulusan</div>
              <h1 className="text-4xl md:text-5xl font-black">{result.passed ? 'LULUS PG' : 'TIDAK LULUS PG'}</h1>
            </div>
          </div>
          <div className="text-center md:text-right bg-white/10 p-6 rounded-xl min-w-[200px]">
            <div className="text-white/80 text-sm font-medium mb-1">Skor Total</div>
            <div className="text-5xl font-black">{result.score.total}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Breakdown Skor */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target size={20} className="text-primary" /> Rincian Skor
            </h3>
            <div className="space-y-6">
              {[
                { label: 'TWK', name: 'Tes Wawasan Kebangsaan', score: result.score.TWK, pg: pg.TWK, max: 150 },
                { label: 'TIU', name: 'Tes Intelegensia Umum', score: result.score.TIU, pg: pg.TIU, max: 175 },
                { label: 'TKP', name: 'Tes Karakteristik Pribadi', score: result.score.TKP, pg: pg.TKP, max: 225 },
              ].map(cat => {
                const passed = cat.score >= cat.pg;
                const pct = (cat.score / cat.max) * 100;
                return (
                  <div key={cat.label}>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="font-bold text-slate-900">{cat.label}</div>
                        <div className="text-xs text-slate-500">{cat.name}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${passed ? 'text-emerald-600' : 'text-red-600'}`}>{cat.score}</div>
                        <div className="text-xs text-slate-400">PG: {cat.pg}</div>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grafik & Rank */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Trophy size={20} className="text-primary" /> Peringkat Nasional
              </h3>
              <div className="flex items-center gap-6">
                <div className="text-6xl font-black text-amber-500">#{result.rank}</div>
                <div className="text-sm text-slate-500 leading-relaxed">
                  dari <strong className="text-slate-900">{result.totalParticipants.toLocaleString()}</strong> peserta yang telah mengikuti simulasi tryout ini.
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Grafik Pencapaian</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= entry.passing ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={() => sessionId && setLocation(`/tryout/${sessionId}/review`)}
            className="flex-1 h-14 flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md"
          >
            <Eye size={20} /> Review Soal & Pembahasan
          </button>
          <button 
            onClick={() => setLocation('/hasil')}
            className="flex-1 h-14 flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Riwayat Hasil
          </button>
          <button
            onClick={() => setLocation('/dashboard')}
            className="sm:w-auto px-6 h-14 flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
