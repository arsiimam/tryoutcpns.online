import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { Category, SubCategory } from "../../data/dummy-cpns-data";
import { Edit2, Plus } from "lucide-react";

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cats, subs] = await Promise.all([
        dummyApi.getCategories(),
        dummyApi.getSubCategories()
      ]);
      setCategories(cats);
      setSubCategories(subs);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader 
        title="Kategori & Subkategori" 
        description="Manajemen struktur materi soal CPNS."
      />

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold">Kategori Utama</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-bold">{c.code}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold">Subkategori Materi</h3>
            <button className="text-sm flex items-center gap-1 text-blue-600 font-medium">
              <Plus size={16} /> Tambah
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 uppercase font-semibold sticky top-0 bg-white">
                <tr>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Materi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subCategories.map((sc) => (
                  <tr key={sc.id}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-xs font-bold rounded">
                        {categories.find(c => c.id === sc.categoryId)?.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">{sc.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
