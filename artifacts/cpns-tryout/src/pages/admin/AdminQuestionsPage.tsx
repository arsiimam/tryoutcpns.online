import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Question, Category, SubCategory } from "../../data/dummy-cpns-data";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form states
  const [text, setText] = useState("");
  const [catId, setCatId] = useState("");
  const [subCatId, setSubCatId] = useState("");
  const [diff, setDiff] = useState<"mudah"|"sedang"|"sulit">("sedang");
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    async function load() {
      const [qs, cats, subCats] = await Promise.all([
        dummyApi.adminGetQuestions(),
        dummyApi.getCategories(),
        dummyApi.getSubCategories()
      ]);
      setQuestions(qs);
      setCategories(cats);
      setSubCategories(subCats);
      setLoading(false);
    }
    load();
  }, []);

  const openDrawer = (q?: Question) => {
    if (q) {
      setEditingQuestion(q);
      setText(q.text);
      setCatId(q.categoryId);
      setSubCatId(q.subCategoryId);
      setDiff(q.difficulty);
      setCorrect(q.correctAnswer);
      setExplanation(q.explanation);
    } else {
      setEditingQuestion(null);
      setText("");
      setCatId(categories[0]?.id || "");
      setSubCatId("");
      setDiff("sedang");
      setCorrect("A");
      setExplanation("");
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (editingQuestion) {
      const updated = await dummyApi.adminUpdateQuestion(editingQuestion.id, { text, categoryId: catId, subCategoryId: subCatId, difficulty: diff, correctAnswer: correct, explanation });
      setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
    } else {
      const newQ = await dummyApi.adminCreateQuestion({ 
        text, categoryId: catId, subCategoryId: subCatId, difficulty: diff, correctAnswer: correct, explanation,
        options: [{key:"A", text:"Opt A"}, {key:"B", text:"Opt B"}, {key:"C", text:"Opt C"}, {key:"D", text:"Opt D"}, {key:"E", text:"Opt E"}]
      });
      setQuestions([newQ, ...questions]);
    }
    setIsDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus soal ini?")) {
      await dummyApi.adminDeleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const filtered = questions.filter(q => q.text.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <PageHeader 
        title="Bank Soal" 
        description="Kelola ribuan soal untuk tryout dan latihan."
        action={
          <button onClick={() => openDrawer()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
            <Plus size={18} /> Tambah Soal
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari cuplikan soal..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Cuplikan Soal</th>
              <th className="px-4 py-3 text-center">Kesulitan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((q, idx) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded uppercase">
                    {categories.find(c => c.id === q.categoryId)?.code}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-md truncate text-slate-700">{q.text}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                    q.difficulty === 'mudah' ? 'bg-emerald-100 text-emerald-700' :
                    q.difficulty === 'sedang' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openDrawer(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(q.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
          <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center p-4 border-b">
              <Dialog.Title className="font-bold text-lg">{editingQuestion ? 'Edit Soal' : 'Tambah Soal Baru'}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={20} /></button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Kategori</label>
                <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full border rounded-lg p-2 bg-white">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Subkategori</label>
                <select value={subCatId} onChange={e => setSubCatId(e.target.value)} className="w-full border rounded-lg p-2 bg-white">
                  <option value="">Pilih Subkategori...</option>
                  {subCategories.filter(sc => sc.categoryId === catId).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Tingkat Kesulitan</label>
                <select value={diff} onChange={e => setDiff(e.target.value as any)} className="w-full border rounded-lg p-2 bg-white">
                  <option value="mudah">Mudah</option>
                  <option value="sedang">Sedang</option>
                  <option value="sulit">Sulit</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Teks Soal</label>
                <textarea rows={4} value={text} onChange={e => setText(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block font-medium mb-1">Kunci Jawaban</label>
                <select value={correct} onChange={e => setCorrect(e.target.value)} className="w-full border rounded-lg p-2 bg-white">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Pembahasan</label>
                <textarea rows={4} value={explanation} onChange={e => setExplanation(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-white border rounded-lg font-medium">Batal</button>
              </Dialog.Close>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">Simpan</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </AdminLayout>
  );
}
