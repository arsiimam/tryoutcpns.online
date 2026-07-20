import React, { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { dummyApi } from "../../lib/dummy-api";
import { Question, TryoutSession } from "../../data/dummy-cpns-data";
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, Grid3X3, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function SessionPage() {
  const [match, params] = useRoute("/tryout/:id/start");
  const [session, setSession] = useState<TryoutSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false); // Mobile grid toggle
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session');

  useEffect(() => {
    async function load() {
      if (sessionId) {
        const [sesData, qData] = await Promise.all([
          dummyApi.getSession(sessionId),
          dummyApi.getQuestions()
        ]);
        setSession(sesData);
        setQuestions(qData);
        setTimeLeft(100 * 60); // 100 minutes dummy
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  useEffect(() => {
    if (timeLeft <= 0 || !session) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, session]);

  const handleForceSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    await dummyApi.submitTryout(session.id);
    setLocation(`/tryout/${session.tryoutId}/result?session=${session.id}`);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = async (optionKey: string) => {
    if (!session || !questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const newAnswers = { ...session.answers, [qId]: optionKey };
    setSession({ ...session, answers: newAnswers });
    await dummyApi.saveAnswer(session.id, qId, optionKey);
  };

  const handleToggleFlag = async () => {
    if (!session || !questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const newFlagged = session.flagged.includes(qId) 
      ? session.flagged.filter(id => id !== qId)
      : [...session.flagged, qId];
    setSession({ ...session, flagged: newFlagged });
    await dummyApi.toggleFlag(session.id, qId);
  };

  if (loading || !session || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isTimeCritical = timeLeft < 300; // < 5 minutes
  const answeredCount = Object.keys(session.answers).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-10">
        <div className="font-bold text-lg text-slate-800 tracking-tight hidden sm:block">
          Simulasi CAT BKN
        </div>
        <button 
          className="sm:hidden p-2 bg-slate-100 rounded-md text-slate-600"
          onClick={() => setIsGridOpen(true)}
        >
          <Grid3X3 size={20} />
        </button>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold border shadow-inner ${isTimeCritical ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-800 border-slate-200'}`}>
          <Clock size={20} />
          {formatTime(timeLeft)}
        </div>
        <button 
          onClick={() => setShowConfirm(true)}
          className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-md"
        >
          Submit
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content (Soal) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col min-h-[calc(100vh-8rem)]">
            {/* Header Soal */}
            <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                  {currentIndex + 1}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    {currentQ.categoryId === 'cat-1' ? 'TWK' : currentQ.categoryId === 'cat-2' ? 'TIU' : 'TKP'}
                  </div>
                  <div className="text-sm font-medium text-slate-800">Soal ke {currentIndex + 1} dari {questions.length}</div>
                </div>
              </div>
              <button 
                onClick={handleToggleFlag}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  session.flagged.includes(currentQ.id)
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Flag size={16} className={session.flagged.includes(currentQ.id) ? 'fill-amber-500' : ''} />
                <span className="hidden sm:inline">Ragu-ragu</span>
              </button>
            </div>

            {/* Teks Soal & Opsi */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
              <div className="text-lg text-slate-800 leading-relaxed mb-8 font-medium">
                {currentQ.text}
              </div>
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = session.answers[currentQ.id] === opt.key;
                  return (
                    <label 
                      key={opt.key}
                      className={`
                        flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/5 shadow-md scale-[1.01]' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex shrink-0 items-center justify-center w-8 h-8 rounded-full border border-slate-300 bg-white font-bold text-slate-600">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-primary" />
                        ) : (
                          opt.key
                        )}
                      </div>
                      <div className="text-slate-700 pt-1 leading-relaxed w-full">
                        <span className="md:hidden font-bold mr-2">{opt.key}.</span>
                        {opt.text}
                      </div>
                      {/* Hidden radio input for accessibility */}
                      <input 
                        type="radio" 
                        name={`q-${currentQ.id}`} 
                        value={opt.key}
                        checked={isSelected}
                        onChange={() => handleSelectOption(opt.key)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Navigasi Footer */}
            <div className="p-4 border-t bg-white flex justify-between shrink-0">
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} /> Prev
              </button>
              <button 
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </main>

        {/* Sidebar Navigasi Grid (Desktop) / Drawer (Mobile) */}
        <aside className={`
          w-80 bg-white border-l flex flex-col shrink-0 shadow-lg absolute right-0 inset-y-0 z-40 transform transition-transform duration-300
          lg:relative lg:translate-x-0
          ${isGridOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Navigasi Soal</h3>
            <button className="lg:hidden text-slate-500" onClick={() => setIsGridOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 border-b grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-200"></div>Belum</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary"></div>Dijawab</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-500"></div>Ragu-ragu</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary border-2 border-amber-500"></div>Djwb+Ragu
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAns = !!session.answers[q.id];
                const isFlag = session.flagged.includes(q.id);
                const isCurr = idx === currentIndex;
                
                let btnClass = "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100";
                if (isAns && isFlag) btnClass = "border-2 border-amber-500 bg-primary text-white font-bold";
                else if (isAns) btnClass = "bg-primary text-white border-primary font-bold";
                else if (isFlag) btnClass = "bg-amber-400 text-white border-amber-500 font-bold";

                if (isCurr) btnClass += " ring-2 ring-offset-1 ring-slate-400";

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsGridOpen(false);
                    }}
                    className={`h-10 rounded flex items-center justify-center text-sm transition-all ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Confirm Dialog */}
      <Dialog.Root open={showConfirm} onOpenChange={setShowConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-2xl shadow-2xl p-6 w-[90vw] max-w-md z-50 animate-in zoom-in-95 duration-200">
            <Dialog.Title className="text-xl font-bold text-slate-900 mb-2">Akhiri Tryout?</Dialog.Title>
            <Dialog.Description className="text-slate-600 mb-6">
              Anda yakin ingin mengakhiri sesi ini? Jawaban tidak dapat diubah lagi setelah disubmit.
            </Dialog.Description>
            
            <div className="bg-slate-50 p-4 rounded-xl space-y-3 mb-6 border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Terjawab:</span>
                <span className="font-bold text-primary">{answeredCount} / {questions.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Belum Dijawab:</span>
                <span className="font-bold text-slate-900">{questions.length - answeredCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Ragu-ragu:</span>
                <span className="font-bold text-amber-600">{session.flagged.length}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  Batal
                </button>
              </Dialog.Close>
              <button 
                onClick={handleForceSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-lg font-bold text-white bg-primary hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-70"
              >
                {submitting ? "Menyimpan..." : "Ya, Submit"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
