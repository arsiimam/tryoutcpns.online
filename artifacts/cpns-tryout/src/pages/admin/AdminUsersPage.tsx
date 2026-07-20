import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader, StatusBadge } from "../../components/ui/shared";
import { dummyApi } from "../../lib/dummy-api";
import { User } from "../../data/dummy-cpns-data";
import { Search, Eye } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    dummyApi.adminGetUsers().then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Manajemen Pengguna" />

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">{u.avatar || 'U'}</div>
                  {u.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelectedUser(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-xl shadow-2xl p-6 w-[90vw] max-w-md z-50">
            {selectedUser && (
              <>
                <Dialog.Title className="text-xl font-bold mb-4">Detail Pengguna</Dialog.Title>
                <div className="space-y-4 text-sm">
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold">{selectedUser.avatar}</div>
                    <div>
                      <div className="font-bold text-lg">{selectedUser.name}</div>
                      <div className="text-slate-500">{selectedUser.email}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Role</span>
                      <span className="font-medium capitalize">{selectedUser.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status Akun</span>
                      <StatusBadge status={selectedUser.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bergabung</span>
                      <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 bg-slate-100 rounded-lg font-medium">Tutup</button>
                  </Dialog.Close>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium">Nonaktifkan</button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </AdminLayout>
  );
}
