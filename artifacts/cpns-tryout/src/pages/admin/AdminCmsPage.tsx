import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { dummyApi, CmsContent } from "../../lib/dummy-api";
import { Save } from "lucide-react";

export function AdminCmsPage() {
  const [content, setContent] = useState<CmsContent | null>(null);

  useEffect(() => {
    dummyApi.adminGetCmsContent().then(setContent);
  }, []);

  if (!content) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="CMS Konten Website" description="Ubah teks dan konten yang tampil di halaman depan pengunjung." />

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-bold text-lg mb-6 border-b pb-2">Hero Section (Landing Page)</h3>
        
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium mb-1">Headline Utama</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              defaultValue={content.hero.headline}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sub-headline</label>
            <textarea 
              rows={3} 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
              defaultValue={content.hero.subheadline}
            />
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
            <Save size={18} /> Simpan Perubahan
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
