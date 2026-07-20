import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { MetricCard, PageHeader } from "../../components/ui/shared";
import { dummyApi, DashboardSummary } from "../../lib/dummy-api";
import { useAuth } from "../../lib/auth-context";
import { FileText, Trophy, Target, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Announcement } from "../../data/dummy-cpns-data";

export function ParticipantDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (user) {
        const [sumData, annData] = await Promise.all([
          dummyApi.getDashboardSummary(user.id),
          dummyApi.getAnnouncements()
        ]);
        setSummary(sumData);
        setAnnouncements(annData);
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading || !summary) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title={`Halo, ${user?.name.split(' ')[0]}! 👋`} 
        description="Siap untuk menaklukkan CPNS hari ini?"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          title="Tryout Selesai" 
          value={summary.totalTryoutsDone} 
          icon={FileText} 
        />
        <MetricCard 
          title="Rata-rata Skor" 
          value={summary.averageScore.toFixed(0)} 
          icon={Target} 
          subtitle="Target Lulus: 311"
          trendUp={summary.averageScore >= 311}
        />
        <MetricCard 
          title="Ranking Nasional" 
          value={`#${summary.rank}`} 
          icon={Trophy} 
        />
        <MetricCard 
          title="Status Paket" 
          value={summary.subscriptionName || "Gratis"} 
          icon={Clock} 
          subtitle={summary.subscriptionDaysLeft > 0 ? `Sisa ${summary.subscriptionDaysLeft} hari` : "Upgrade sekarang"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Grafik Skor */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Perkembangan Skor</h3>
            <div className="h-72 w-full">
              {summary.scoreHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tryout" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 550]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b', strokeWidth: 2}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Belum ada data tryout
                </div>
              )}
            </div>
          </div>

          {/* Pengumuman */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Pengumuman Penting</h3>
            <div className="space-y-4">
              {announcements.map(ann => (
                <div key={ann.id} className={`p-4 rounded-lg border-l-4 ${ann.isImportant ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-slate-300'}`}>
                  <h4 className="font-semibold text-slate-900 mb-1">{ann.title}</h4>
                  <p className="text-sm text-slate-600">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tryout Terbaru */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Tryout Tersedia</h3>
              <Link href="/tryout" className="text-sm text-primary font-medium hover:underline">Lihat Semua</Link>
            </div>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">Tryout Akbar #1</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">FREE</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={12}/> 100 mnt</span>
                  <span className="flex items-center gap-1"><FileText size={12}/> 110 Soal</span>
                </div>
              </div>
              <div className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">Premium HOTS #1</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white">PRO</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={12}/> 100 mnt</span>
                  <span className="flex items-center gap-1"><FileText size={12}/> 110 Soal</span>
                </div>
              </div>
            </div>
            <Link href="/tryout" className="mt-4 w-full h-10 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">
              Mulai Belajar <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
