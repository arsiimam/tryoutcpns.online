import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
import { useAuth } from "../../lib/auth-context";
import { Trophy, Medal, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface RankingEntry {
  rank: number; userId: string; userName: string;
  total: number; TWK: number; TIU: number; TKP: number;
  date: string; isMe?: boolean;
}
interface Tryout { id: string; title: string; }
interface DistBucket { range: string; count: number; }

export function RankingPage() {
  const { user } = useAuth();
  const [ranking,           setRanking]           = useState<RankingEntry[]>([]);
  const [tryouts,           setTryouts]           = useState<Tryout[]>([]);
  const [selectedTryout,   setSelectedTryout]    = useState<string>("all");
  const [myActualRank,     setMyActualRank]       = useState<number>(0);
  const [myScore,          setMyScore]            = useState<number>(0);
  const [totalParticipants,setTotalParticipants]  = useState<number>(0);
  const [distribution,     setDistribution]       = useState<DistBucket[]>([]);
  const [loading,          setLoading]            = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const qs = selectedTryout !== "all" ? `?tryoutId=${selectedTryout}` : "";
        const [rankRes, toRes] = await Promise.all([
          fetch(`/api/participant/ranking${qs}`, { credentials: "include" }).then(r => r.json()),
          fetch("/api/participant/tryouts", { credentials: "include" }).then(r => r.json()),
        ]);
        setRanking(rankRes.ranking ?? []);
        setMyActualRank(rankRes.myActualRank ?? 0);
        setMyScore(rankRes.myScore ?? 0);
        setTotalParticipants(rankRes.totalParticipants ?? 0);
        setDistribution(rankRes.distribution ?? []);
        setTryouts(toRes.tryouts ?? []);
      } catch { } finally { setLoading(false); }
    }
    load();
  }, [selectedTryout]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const hasPlayed  = myScore > 0;
  const topPct     = totalParticipants > 0
    ? Math.max(1, Math.round((myActualRank / totalParticipants) * 100))
    : 0;

  // Tandai bucket di mana skor user berada
  const distWithMe = distribution.map(b => {
    const [lo, hi] = b.range.split("–").map(Number);
    return { ...b, isMe: hasPlayed && myScore >= lo && myScore <= hi };
  });

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
        {/* Histogram distribusi */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Distribusi Skor Peserta</h3>
          <p className="text-xs text-slate-400 mb-5">
            {totalParticipants > 0
              ? `${totalParticipants.toLocaleString()} peserta total (termasuk simulasi nasional)`
              : "Belum ada data"}
            {hasPlayed && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[11px]">
                ● Posisi Anda: {myScore}
              </span>
            )}
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distWithMe} margin={{ top: 5, right: 0, bottom: 5, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(245,158,11,0.08)" }}
                  formatter={(v: number) => [`${v.toLocaleString()} peserta`, "Jumlah"]}
                />
                <Bar
                  dataKey="count"
                  name="Jumlah Peserta"
                  radius={[4, 4, 0, 0]}
                  fill="#f59e0b"
                  // Sorot bucket user dengan warna berbeda
                  label={false}
                >
                  {distWithMe.map((entry, idx) => (
                    <rect
                      key={idx}
                      fill={entry.isMe ? "#1E4D9C" : "#f59e0b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Passing grade marker info */}
          <p className="text-xs text-slate-400 mt-2 text-center">
            Passing grade SKD: <strong>311</strong> | Maks nilai: <strong>550</strong>
          </p>
        </div>

        {/* Rank card */}
        {hasPlayed ? (
          <div className="bg-primary rounded-xl border border-primary shadow-xl p-6 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <Trophy size={44} className="text-amber-400 mb-3 relative z-10" />
            <div className="text-white/80 font-medium text-xs uppercase tracking-wider mb-1 relative z-10">Peringkat Anda</div>
            <div className="text-5xl font-black text-white mb-2 relative z-10">
              #{myActualRank.toLocaleString()}
            </div>
            <div className="text-white/70 text-xs mb-4 relative z-10">
              dari {totalParticipants.toLocaleString()} peserta
            </div>
            <div className="flex flex-col gap-2 w-full relative z-10">
              <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                Skor Total: <span className="font-bold">{myScore}</span>
              </div>
              <div className="bg-amber-400/20 px-4 py-2 rounded-lg border border-amber-400/30 text-amber-300 text-sm font-semibold">
                🏆 Top {topPct}% Nasional
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col justify-center items-center text-center gap-3">
            <Users size={40} className="text-slate-300" />
            <p className="text-sm text-slate-500 font-medium">Belum ada skor</p>
            <p className="text-xs text-slate-400">Selesaikan tryout terlebih dahulu untuk melihat peringkat Anda.</p>
          </div>
        )}
      </div>

      {/* Tabel top-100 user nyata */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Top 100 Peserta Aktif</h3>
          <span className="text-xs text-slate-400">Menampilkan peserta nyata yang telah mengikuti tryout</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs">
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
            {ranking.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                  Belum ada peserta yang menyelesaikan tryout ini.
                </td>
              </tr>
            ) : ranking.map((row) => {
              const isMe = row.userId === user?.id;
              return (
                <tr key={row.userId} className={`${isMe ? "bg-blue-50/60" : "hover:bg-slate-50"} transition-colors`}>
                  <td className="px-6 py-4">
                    {row.rank === 1 ? <Medal size={22} className="text-amber-500 drop-shadow" /> :
                     row.rank === 2 ? <Medal size={22} className="text-slate-400 drop-shadow" /> :
                     row.rank === 3 ? <Medal size={22} className="text-amber-700 drop-shadow" /> :
                     <span className="font-bold text-slate-500 ml-1">{row.rank}</span>}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {row.userName}
                    {isMe && <span className="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Anda</span>}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">{row.TWK}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{row.TIU}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{row.TKP}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 text-base">{row.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
