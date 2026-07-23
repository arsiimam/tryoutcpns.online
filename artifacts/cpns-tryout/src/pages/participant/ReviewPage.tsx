import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
interface ReviewQuestion {
  id: string; text: string; categoryId: string;
  options: { key: string; text: string }[];
  correctAnswer: string | null; explanation: string;
  userAnswer: string | null; isCorrect: boolean;
  isFavorite?: boolean;
}
import { useAuth } from "../../lib/auth-context";
import { Heart, CheckCircle2, XCircle, Search, Filter } from "lucide-react";

export function ReviewPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"semua" | "salah" | "favorit">("semua");
  const [openExplanation, setOpenExplanation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/participant/review", { credentials: "include" });
        const data = await r.json();
        setQuestions(data.questions ?? []);
        setSessionId(data.sessionId ?? null);
      } catch { } finally { setLoading(false); }
    }
    load();
  }, []);

  const toggleFav = (qId: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? {...q, isFavorite: !q.isFavorite} : q));
  };

  const toggleExplanation = (qId: string) => {
    setOpenExplanation(prev => ({...prev, [qId]: !prev[qId]}));
  };

  let filteredQs = questions;
  if (tab === "favorit") filteredQs = questions.filter(q => q.isFavorite);
  if (tab === "salah") filteredQs = questions.filter(q => q.userAnswer !== null && !q.isCorrect);

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
        title="Review Soal" 
        description="Pelajari kembali soal-soal tryout untuk memahami letak kesalahan Anda."
      />

      <div className="flex border-b border-slate-200 mb-6">
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${tab === 'semua' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setTab('semua')}
        >
          Semua Soal
          {tab === 'semua' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${tab === 'salah' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setTab('salah')}
        >
          Soal Salah
          {tab === 'salah' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${tab === 'favorit' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setTab('favorit')}
        >
          Favorit
          {tab === 'favorit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      <div className="space-y-6">
        {filteredQs.map((q) => {
          const userAns = q.userAnswer;
          const isWrong = q.userAnswer !== null && !q.isCorrect;
          const isExpOpen = openExplanation[q.id];

          return (
            <div key={q.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <span className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full tracking-wider uppercase">
                   {q.categoryId || 'Materi'}
                </span>
                <button 
                  onClick={() => toggleFav(q.id)}
                  className={`p-2 rounded-full transition-colors ${q.isFavorite ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-slate-400 hover:bg-slate-200'}`}
                >
                  <Heart size={18} className={q.isFavorite ? 'fill-current' : ''} />
                </button>
              </div>

              <div className="p-6">
                <div className="text-slate-800 font-medium mb-6 leading-relaxed">
                  {q.text}
                </div>
                
                <div className="space-y-3 mb-6">
                  {q.options.map((opt) => {
                    let optClass = "border-slate-200 bg-white opacity-50";
                    let icon = null;

                    if (opt.key === q.correctAnswer) {
                      optClass = "border-emerald-500 bg-emerald-50 text-emerald-900";
                      icon = <CheckCircle2 size={18} className="text-emerald-600" />;
                    } else if (opt.key === userAns && isWrong) {
                      optClass = "border-red-500 bg-red-50 text-red-900";
                      icon = <XCircle size={18} className="text-red-600" />;
                    }

                    return (
                      <div key={opt.key} className={`flex items-start gap-3 p-3 rounded-lg border-2 ${optClass}`}>
                        <div className="font-bold mt-0.5">{opt.key}.</div>
                        <div className="flex-1">{opt.text}</div>
                        {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => toggleExplanation(q.id)}
                  className="text-sm font-semibold text-primary hover:underline focus:outline-none"
                >
                  {isExpOpen ? "Sembunyikan Pembahasan" : "Lihat Pembahasan"}
                </button>

                {isExpOpen && (
                  <div className="mt-4 p-4 bg-slate-50 border rounded-lg text-sm text-slate-800 leading-relaxed">
                    <div className="font-bold text-slate-900 mb-1">Pembahasan:</div>
                    {q.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredQs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-slate-500">Tidak ada soal dalam kategori ini.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
