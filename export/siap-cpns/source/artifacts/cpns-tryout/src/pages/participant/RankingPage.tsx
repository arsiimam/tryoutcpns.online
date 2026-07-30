import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
interface RankingEntry { rank: number; userId: string; userName: string; total: number; TWK: number; TIU: number; TKP: number; date: string; isMe?: boolean; }
interface Tryout { id: string; title: string; }
import { useAuth } from "../../lib/auth-context";
import { Trophy, Medal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [selectedTryout, setSelectedTryout] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const qs = selectedTryout !== "all" ? `?tryoutId=${selectedTryout}` : "";
        const [rankRes, toRes] = await Promise.all([
          fetch(`/api/participant/ranking${qs}`, { credentials: "include" }).then(r => r.json()),
          fetch("/api/participant/tryouts", { credentials: "include" }).then(r => r.json()),
        ]);
        setRanking(rankRes.ranking ?? []);
        setTryouts(toRes.tryouts ?? []);
      } catch { } finally { setLoading(false); }
    }
    load();
  }, [selectedTryout]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Dummy histogram data
  const distData = [
    { range: "< 200", count: 120 },
    { range: "200-250", count: 450 },
    { range: "250-300", count: 800 },
    { range: "300-350", count: 400 },
    { range: "> 350", count: 150 },
  ];

  const myRank = ranking.find(r => r.userId === user?.id);

  return (
    <DashboardLayout>
      <PageHeader 
        title="Ranking Nasional" 
        description="Lihat peringkat Anda dibandingkan puluhan ribu peserta lainnya."
      />

      <div className="flex justify-end mb-6">
        <select 
          className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-w-[250px]"
          value={selectedTryout}
          onChange={e => setSelectedTryout(e.target.value)}
        >
          <option value="all">Ranking Keseluruhan</option>
          {tryouts.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribusi Skor Peserta</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" name="Jumlah Peserta" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {myRank && (
          <div className="bg-primary rounded-xl border border-primary shadow-xl p-6 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <Trophy size={48} className="text-amber-400 mb-4 relative z-10" />
            <div className="text-white/80 font-medium text-sm uppercase tracking-wider mb-1 relative z-10">Peringkat Anda</div>
            <div className="text-6xl font-black text-white mb-4 relative z-10">#{myRank.rank}</div>
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm relative z-10 border border-white/20">
              Skor Total: <span className="font-bold">{myRank.total}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-6 py-4 w-20">Rank</th>
              <th className="px-6 py-4">Peserta</th>
              <th className="px-6 py-4 text-center">TWK</th>
              <th className="px-6 py-4 text-center">TIU</th>
              <th className="px-6 py-4 text-center">TKP</th>
              <th className="px-6 py-4 text-right">Skor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((row) => {
              const isMe = row.userId === user?.id;
              return (
                <tr key={row.userId} className={`${isMe ? 'bg-blue-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                  <td className="px-6 py-4">
                    {row.rank === 1 ? <Medal size={24} className="text-amber-500 drop-shadow" /> : 
                     row.rank === 2 ? <Medal size={24} className="text-slate-400 drop-shadow" /> :
                     row.rank === 3 ? <Medal size={24} className="text-amber-700 drop-shadow" /> : 
                     <span className="font-bold text-slate-500 ml-1">{row.rank}</span>}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {row.userName} {isMe && <span className="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Anda</span>}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">{row.TWK}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{row.TIU}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{row.TKP}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 text-lg">{row.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
