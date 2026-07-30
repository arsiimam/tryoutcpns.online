import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { PageHeader } from "../../components/ui/shared";
import { Search, Eye, Crown, RefreshCw, Plus, Loader2, AlertTriangle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface SubscriptionInfo {
  planId: string;
  planName: string;
  status: string; // 'active' | 'expired' | 'cancelled'
  startedAt: string;
  expiresAt: string;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  authProvider: string;
  avatarUrl: string | null;
  createdAt: string;
  subscription: SubscriptionInfo | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SubBadge({ sub }: { sub: SubscriptionInfo | null }) {
  if (!sub) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        Gratis
      </span>
    );
  }

  const now = new Date();
  const expires = new Date(sub.expiresAt);
  const isActive = sub.status === "active" && expires > now;

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Crown size={11} />
        {sub.planName}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
      Kedaluwarsa
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      Peserta
    </span>
  );
}

interface Plan { id: string; name: string; durationDays: number; price: number; }

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  /* ── Grant subscription state ── */
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [grantPlanId, setGrantPlanId] = useState("");
  const [grantDays, setGrantDays] = useState(30);
  const [grantSaving, setGrantSaving] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [grantOk, setGrantOk] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { users: AdminUser[] }) => {
        setUsers(data.users ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  /* Load plans for grant modal */
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans((d.plans ?? []).filter((p: Plan) => p.price > 0)))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, []);

  function openGrant(u: AdminUser) {
    setGrantUser(u);
    setGrantPlanId(plans[0]?.id ?? "");
    setGrantDays(plans[0]?.durationDays ?? 30);
    setGrantError("");
    setGrantOk(false);
    setGrantSaving(false);
  }

  async function handleGrant() {
    if (!grantUser || !grantPlanId) return;
    const plan = plans.find((p) => p.id === grantPlanId);
    if (!plan) return;
    setGrantSaving(true);
    setGrantError("");
    try {
      const r = await fetch(`/api/admin/users/${grantUser.id}/subscription`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, planName: plan.name, durationDays: grantDays }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Gagal memberi langganan.");
      setGrantOk(true);
      load(); // refresh user list
    } catch (e: any) {
      setGrantError(e.message);
    } finally {
      setGrantSaving(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout>
      <PageHeader title="Manajemen Pengguna" />

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} pengguna</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <RefreshCw size={18} className="animate-spin mr-2" /> Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status Langganan</th>
                  <th className="px-4 py-3">Mulai Langganan</th>
                  <th className="px-4 py-3">Selesai Langganan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const sub = u.subscription;
                    const isSubActive =
                      sub &&
                      sub.status === "active" &&
                      new Date(sub.expiresAt) > new Date();

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        {/* Name + email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.fullName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {initials(u.fullName)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{u.fullName}</div>
                              <div className="text-xs text-slate-400 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3 text-slate-500 capitalize text-xs">
                          {u.authProvider === "google" ? (
                            <span className="flex items-center gap-1">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              Google
                            </span>
                          ) : (
                            "Email"
                          )}
                        </td>

                        {/* Subscription status */}
                        <td className="px-4 py-3">
                          <SubBadge sub={sub} />
                        </td>

                        {/* Started at */}
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {isSubActive ? formatDate(sub!.startedAt) : "—"}
                        </td>

                        {/* Expires at */}
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {isSubActive ? (
                            <span className={
                              new Date(sub!.expiresAt) < new Date(Date.now() + 7 * 86400000)
                                ? "text-amber-600 font-medium"
                                : ""
                            }>
                              {formatDate(sub!.expiresAt)}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openGrant(u)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Beri Langganan"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Lihat detail"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-[90vw] max-w-md z-50">
            {selectedUser && (
              <>
                <Dialog.Title className="text-lg font-bold mb-4 text-slate-800">
                  Detail Pengguna
                </Dialog.Title>

                {/* Avatar + name */}
                <div className="flex gap-4 items-center mb-5">
                  {selectedUser.avatarUrl ? (
                    <img
                      src={selectedUser.avatarUrl}
                      alt={selectedUser.fullName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                      {initials(selectedUser.fullName)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-lg text-slate-900">{selectedUser.fullName}</div>
                    <div className="text-slate-500 text-sm">{selectedUser.email}</div>
                  </div>
                </div>

                {/* Account info */}
                <div className="bg-slate-50 rounded-lg border divide-y text-sm mb-4">
                  <Row label="Role"><RoleBadge role={selectedUser.role} /></Row>
                  <Row label="Login via" value={selectedUser.authProvider === "google" ? "Google" : "Email & Password"} />
                  <Row label="Bergabung" value={formatDate(selectedUser.createdAt)} />
                </div>

                {/* Subscription info */}
                <div className="text-sm font-semibold text-slate-700 mb-2">Status Langganan</div>
                <div className="bg-slate-50 rounded-lg border divide-y text-sm">
                  {selectedUser.subscription ? (
                    <>
                      <Row label="Paket">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                          <Crown size={13} />{selectedUser.subscription.planName}
                        </span>
                      </Row>
                      <Row label="Status">
                        <SubBadge sub={selectedUser.subscription} />
                      </Row>
                      <Row label="Mulai" value={formatDate(selectedUser.subscription.startedAt)} />
                      <Row label="Selesai" value={formatDate(selectedUser.subscription.expiresAt)} />
                    </>
                  ) : (
                    <Row label="Paket" value="Gratis (tidak berlangganan)" />
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">
                      Tutup
                    </button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {/* ── Grant Subscription Modal ── */}
      <Dialog.Root open={!!grantUser} onOpenChange={(open) => !open && setGrantUser(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-[90vw] max-w-sm z-50">
            {grantUser && (
              <>
                <Dialog.Title className="text-lg font-bold mb-1 text-slate-800">
                  Beri Langganan
                </Dialog.Title>
                <p className="text-sm text-slate-500 mb-5">
                  Pengguna: <span className="font-semibold text-slate-700">{grantUser.fullName}</span>
                </p>

                {grantOk ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <Crown size={36} className="text-amber-500" />
                    <p className="font-semibold text-emerald-700">Langganan berhasil diberikan!</p>
                    <Dialog.Close asChild>
                      <button className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm">
                        Tutup
                      </button>
                    </Dialog.Close>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Paket</label>
                        {plans.length === 0 ? (
                          <p className="text-sm text-slate-400">Belum ada paket aktif. Buat paket di menu Langganan.</p>
                        ) : (
                          <select
                            value={grantPlanId}
                            onChange={(e) => {
                              setGrantPlanId(e.target.value);
                              const p = plans.find((pl) => pl.id === e.target.value);
                              if (p) setGrantDays(p.durationDays);
                            }}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Durasi (hari)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={grantDays}
                          onChange={(e) => setGrantDays(Number(e.target.value))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>

                    {grantError && (
                      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
                        <AlertTriangle size={14} /> {grantError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Dialog.Close asChild>
                        <button className="flex-1 py-2 border rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                          Batal
                        </button>
                      </Dialog.Close>
                      <button
                        onClick={handleGrant}
                        disabled={grantSaving || plans.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        {grantSaving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan…</> : "Beri Langganan"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AdminLayout>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-slate-500">{label}</span>
      {children ?? <span className="font-medium text-slate-800">{value}</span>}
    </div>
  );
}
