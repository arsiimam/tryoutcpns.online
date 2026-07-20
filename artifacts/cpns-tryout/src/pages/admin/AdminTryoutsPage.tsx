import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Tryout } from "../../data/dummy-cpns-data";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function AdminTryoutsPage() {
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTryout, setEditingTryout] = useState<Tryout | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<"draft"|"published">("draft");
  const [free, setFree] = useState(true);

  useEffect(() => {
    dummyApi.adminGetTryouts().then(data => {
      setTryouts(data);
      setLoading(false);
    });
  }, []);

  const openDrawer = (t?: Tryout) => {
    if (t) {
      setEditingTryout(t);
      setTitle(t.title);
      setDesc(t.description);
      setStatus(t.status);
      setFree(t.isAccessibleFree);
    } else {
      setEditingTryout(null);
      setTitle("");
      setDesc("");
      setStatus("draft");
      setFree(true);
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (editingTryout) {
      const updated = await dummyApi.adminUpdateTryout(editingTryout.id, { title, description: desc, status, isAccessibleFree: free });
      setTryouts(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      const newT = await dummyApi.adminCreateTryout({ 
        title, description: desc, status, isAccessibleFree: free,
        duration: 100, passingScore: { TWK: 65, TIU: 80, TKP: 166, total: 311 },
        composition: { TWK: 30, TIU: 35, TKP: 45 }, schedule: null
      });
      setTryouts([newT, ...tryouts]);
    }
    setIsDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus tryout ini?")) {
      await dummyApi.adminDeleteTryout(id);
      setTryouts(prev => prev.filter(t => t.id !== id));
    }
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader 
        title="Manajemen Tryout" 
        action={
          <button onClick={() => openDrawer()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
            <Plus size={18} /> Buat Tryout Baru
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Judul Tryout</th>
              <th className="px-4 py-3">Akses</th>
              <th className="px-4 py-3">Soal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tryouts.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{t.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${t.isAccessibleFree ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {t.isAccessibleFree ? 'GRATIS' : 'PREMIUM'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.composition.TWK + t.composition.TIU + t.composition.TKP} Soal
                </td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openDrawer(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
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
              <Dialog.Title className="font-bold text-lg">{editingTryout ? 'Edit Tryout' : 'Buat Tryout'}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={20} /></button>
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Judul Tryout</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block font-medium mb-1">Deskripsi</label>
                <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block font-medium mb-1">Status Publish</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border rounded-lg p-2 bg-white">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Hak Akses</label>
                <select value={free ? 'true' : 'false'} onChange={e => setFree(e.target.value === 'true')} className="w-full border rounded-lg p-2 bg-white">
                  <option value="true">Gratis (Semua User)</option>
                  <option value="false">Premium (Silver/Gold)</option>
                </select>
              </div>
              {/* Add more fields here as needed for composition and passing score */}
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
