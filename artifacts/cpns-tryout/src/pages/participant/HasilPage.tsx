import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader, MetricCard } from "../../components/ui/shared";
interface Result {
  id: string; sessionId: string; tryoutId: string; tryoutName?: string;
  score: { TWK: number; TIU: number; TKP: number; total: number };
  passed: boolean; rank: number; totalParticipants: number; completedAt: string;
}
import { useAuth } from "../../lib/auth-context";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FileText, Target, CheckCircle, XCircle, ArrowRight } from "lucide-react";

export function HasilPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const r = await fetch("/api/participant/results", { credentials: "include" });
        const data = await r.json();
        setResults(data.results ?? []);
      } catch { } finally { setLoading(false); }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalTryouts = results.length;
  const bestScore = Math.max(...results.map(r => r.score.total), 0);
  const avgScore = results.length ? results.reduce((acc, curr) => acc + curr.score.total, 0) / results.length : 0;
  const passCount = results.filter(r => r.passed).length;

  const chartData = results.map((r, i) => ({
    name: `Tryout ${i+1}`,
    TWK: r.score.TWK,
    TIU: r.score.TIU,
    TKP: r.score.TKP,
    Total: r.score.total
  }));

  const avgCatScores = [
    { subject: "TWK", score: results.length ? results.reduce((a,c) => a + c.score.TWK, 0)/results.length : 0, pg: 65 },
    { subject: "TIU", score: results.length ? results.reduce((a,c) => a + c.score.TIU, 0)/results.length : 0, pg: 80 },
    { subject: "TKP", score: results.length ? results.reduce((a,c) => a + c.score.TKP, 0)/results.length : 0, pg: 166 }
  ];

  return (
    <DashboardLayout>
      <PageHeader 
        title="Riwayat Hasil & Analisis" 
        description="Pantau perkembangan skor Anda dari waktu ke waktu."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Tryout" value={totalTryouts} icon={FileText} />
        <MetricCard title="Skor Tertinggi" value={bestScore} icon={Target} />
        <MetricCard title="Rata-rata Skor" value={avgScore.toFixed(0)} icon={Target} />
        <MetricCard title="Lulus Passing Grade" value={passCount} icon={CheckCircle} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Tren Skor Keseluruhan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} domain={[0, 'dataMax + 50']} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#1e3a5f" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Rata-rata vs Passing Grade</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgCatScores} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend />
                <Bar dataKey="score" name="Skor Anda" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pg" name="Passing Grade" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-slate-900">Riwayat Tryout</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">TWK</th>
                <th className="px-6 py-4">TIU</th>
                <th className="px-6 py-4">TKP</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                    {new Date(r.completedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                  </td>
                  <td className={`px-6 py-4 font-medium ${r.score.TWK >= 65 ? 'text-emerald-600' : 'text-red-600'}`}>{r.score.TWK}</td>
                  <td className={`px-6 py-4 font-medium ${r.score.TIU >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>{r.score.TIU}</td>
                  <td className={`px-6 py-4 font-medium ${r.score.TKP >= 166 ? 'text-emerald-600' : 'text-red-600'}`}>{r.score.TKP}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{r.score.total}</td>
                  <td className="px-6 py-4">
                    {r.passed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full tracking-wider">
                        <CheckCircle size={12} /> LULUS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-bold rounded-full tracking-wider">
                        <XCircle size={12} /> GAGAL
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setLocation(`/tryout/${r.sessionId}/review`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                      >
                        Review Soal
                      </button>
                      <button
                        onClick={() => setLocation(`/tryout/${r.tryoutId}/result?session=${r.sessionId}`)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-primary font-medium text-sm"
                      >
                        Detail <ArrowRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <div className="p-8 text-center text-slate-500">Belum ada riwayat tryout.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
