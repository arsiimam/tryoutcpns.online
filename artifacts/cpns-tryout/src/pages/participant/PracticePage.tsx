import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { PageHeader } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Question, Category, SubCategory } from "../../data/dummy-cpns-data";
import { Filter, ChevronDown, Heart, CheckCircle2, XCircle, Eye } from "lucide-react";

export function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterSubCat, setFilterSubCat] = useState<string>("");
  const [filterDiff, setFilterDiff] = useState<string>("");
  
  const [showAnswerFor, setShowAnswerFor] = useState<Record<string, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      const cats = await dummyApi.getCategories();
      setCategories(cats);
      loadQs();
    }
    init();
  }, []);

  useEffect(() => {
    if (filterCat) {
      dummyApi.getSubCategories(filterCat).then(setSubCategories);
    } else {
      setSubCategories([]);
    }
    setFilterSubCat("");
    loadQs();
  }, [filterCat]);

  useEffect(() => {
    loadQs();
  }, [filterSubCat, filterDiff]);

  const loadQs = async () => {
    setLoading(true);
    const qs = await dummyApi.getQuestions({
      categoryId: filterCat || undefined,
      subCategoryId: filterSubCat || undefined,
      difficulty: filterDiff || undefined
    });
    setQuestions(qs);
    setLoading(false);
  };

  const handleSelectAnswer = (qId: string, optKey: string) => {
    if (showAnswerFor[qId]) return; // locked if answer shown
    setSelectedAnswers(prev => ({...prev, [qId]: optKey}));
  };

  const toggleAnswer = (qId: string) => {
    setShowAnswerFor(prev => ({...prev, [qId]: !prev[qId]}));
  };

  const toggleFav = async (qId: string) => {
    await dummyApi.toggleFavorite(qId);
    setQuestions(prev => prev.map(q => q.id === qId ? {...q, isFavorite: !q.isFavorite} : q));
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title="Bank Latihan Soal" 
        description="Latih kemampuanmu dengan ribuan soal ter-update berdasarkan kisi-kisi terbaru."
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
          <Filter size={18} /> Filter:
        </div>
        <select 
          className="flex-1 h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
        </select>
        
        <select 
          className="flex-1 h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full disabled:opacity-50"
          value={filterSubCat}
          onChange={e => setFilterSubCat(e.target.value)}
          disabled={!filterCat}
        >
          <option value="">Semua Subkategori</option>
          {subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
        </select>

        <select 
          className="flex-1 h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full"
          value={filterDiff}
          onChange={e => setFilterDiff(e.target.value)}
        >
          <option value="">Semua Tingkat Kesulitan</option>
          <option value="mudah">Mudah</option>
          <option value="sedang">Sedang</option>
          <option value="sulit">Sulit</option>
        </select>
      </div>

      {/* Soal List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center bg-white rounded-xl border">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-slate-500">Tidak ada soal yang sesuai filter.</p>
          </div>
        ) : (
          questions.map((q, idx) => {
            const isAnswerShown = showAnswerFor[q.id];
            const userAns = selectedAnswers[q.id];
            const isCorrect = userAns === q.correctAnswer;

            return (
              <div key={q.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full tracking-wider uppercase">
                      {categories.find(c => c.id === q.categoryId)?.code}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      Sub: {subCategories.find(sc => sc.id === q.subCategoryId)?.name || 'Materi'}
                    </span>
                  </div>
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
                      let optClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300";
                      let icon = null;

                      if (isAnswerShown) {
                        if (opt.key === q.correctAnswer) {
                          optClass = "border-emerald-500 bg-emerald-50 text-emerald-900";
                          icon = <CheckCircle2 size={18} className="text-emerald-600" />;
                        } else if (opt.key === userAns && !isCorrect) {
                          optClass = "border-red-500 bg-red-50 text-red-900";
                          icon = <XCircle size={18} className="text-red-600" />;
                        } else {
                          optClass = "border-slate-200 opacity-50 bg-slate-50";
                        }
                      } else if (userAns === opt.key) {
                        optClass = "border-primary bg-primary/5";
                      }

                      return (
                        <button 
                          key={opt.key}
                          onClick={() => handleSelectAnswer(q.id, opt.key)}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${optClass}`}
                        >
                          <div className={`font-bold mt-0.5 ${isAnswerShown && opt.key === q.correctAnswer ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {opt.key}.
                          </div>
                          <div className="flex-1">{opt.text}</div>
                          {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center border-t pt-4">
                    <button 
                      onClick={() => toggleAnswer(q.id)}
                      disabled={!userAns && !isAnswerShown}
                      className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye size={16} /> 
                      {isAnswerShown ? "Sembunyikan Pembahasan" : "Cek Jawaban & Pembahasan"}
                    </button>
                  </div>

                  {isAnswerShown && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-slate-800 leading-relaxed">
                      <div className="font-bold text-blue-900 mb-1">Pembahasan:</div>
                      {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
