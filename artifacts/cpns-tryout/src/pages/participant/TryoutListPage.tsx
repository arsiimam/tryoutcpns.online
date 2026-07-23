import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
interface Tryout {
  id: string; title: string; description: string; duration: number;
  composition: { TWK: number; TIU: number; TKP: number };
  passingScore: { total: number; TWK: number; TIU: number; TKP: number };
  isAccessibleFree: boolean; status: string; schedule?: string;
}
import { Link, useLocation } from "wouter";
import { Clock, FileText, Target, PlayCircle, Lock } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export function TryoutListPage() {
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const data = await fetch("/api/participant/tryouts", { credentials: "include" }).then(r => r.json());
        setTryouts(data.tryouts ?? []);
      } catch { } finally { setLoading(false); }
    }
    load();
  }, [user]);

  const hasPremium = !!(
    user?.subscription?.status === "active" &&
    new Date(user?.subscription?.expiresAt ?? 0) > new Date()
  );

  if (loading) {
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
        title="Daftar Tryout CAT" 
        description="Pilih tryout dan simulasikan ujian sesungguhnya dengan timer."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tryouts.map((to) => {
          const totalSoal = to.composition.TWK + to.composition.TIU + to.composition.TKP;
          const isLocked = !to.isAccessibleFree && !hasPremium;

          return (
            <div key={to.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b flex-1">
                <div className="flex justify-between items-start mb-4">
                  {to.isAccessibleFree ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full tracking-wider">GRATIS</span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full tracking-wider flex items-center gap-1">
                      <Lock size={10} /> PREMIUM
                    </span>
                  )}
                  {to.schedule && (
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(to.schedule).toLocaleDateString('id-ID')}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2">{to.title}</h3>
                <p className="text-sm text-slate-500 mb-6 line-clamp-2">{to.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    <span>{to.duration} Menit</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText size={16} className="text-slate-400" />
                    <span>{totalSoal} Soal</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 col-span-2">
                    <Target size={16} className="text-slate-400" />
                    <span>Passing Grade: {to.passingScore.total}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50">
                {isLocked ? (
                  <Link href="/subscription" className="w-full flex items-center justify-center gap-2 h-10 rounded-lg font-semibold text-slate-500 bg-slate-200 hover:bg-slate-300 transition-colors">
                    <Lock size={16} /> Buka dengan Premium
                  </Link>
                ) : (
                  <Link href={`/tryout/${to.id}`} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg font-semibold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md">
                    <PlayCircle size={16} /> Mulai Tryout
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
