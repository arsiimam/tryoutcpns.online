import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, FileQuestion, BookOpen, Clock,
  Settings, CreditCard, Tag, BarChart3, LogOut, Menu, X,
  ShieldAlert, SlidersHorizontal, Star,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const BLUE     = "#4f5eea";
const BLUE_D   = "#4147d5";
const BLUE_ACT = "rgba(255,255,255,0.18)";
const BLUE_HOV = "rgba(255,255,255,0.09)";

const adminNavItems = [
  { icon: LayoutDashboard,   label: "Overview",          href: "/admin/dashboard" },
  { icon: FileQuestion,      label: "Bank Soal",          href: "/admin/questions" },
  { icon: BookOpen,          label: "Kategori",           href: "/admin/categories" },
  { icon: Clock,             label: "Tryout",             href: "/admin/tryouts" },
  { icon: Users,             label: "Pengguna",           href: "/admin/users" },
  { icon: Star,              label: "Paket Langganan",    href: "/admin/subscriptions" },
  { icon: CreditCard,        label: "Pembayaran",         href: "/admin/payments" },
  { icon: Tag,               label: "Kupon Promo",        href: "/admin/coupons" },
  { icon: BarChart3,         label: "Laporan",            href: "/admin/reports" },
  { icon: Settings,          label: "CMS Web",            href: "/admin/cms" },
  { icon: SlidersHorizontal, label: "Pengaturan",         href: "/admin/settings" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const pageSlug = location.split("/").pop() ?? "dashboard";
  const pageLabel = pageSlug.replace(/-/g, " ");

  return (
    <div className="min-h-screen flex" style={{ background: "#f6f7fc" }}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====== SIDEBAR ====== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: BLUE }}
      >
        {/* Logo strip */}
        <div
          className="h-16 flex items-center px-5 shrink-0 gap-3"
          style={{ background: BLUE_D, borderBottom: "1px solid rgba(255,255,255,0.12)" }}
        >
          <Link href="/" className="flex items-center">
            <div style={{
              background: "#fff",
              borderRadius: 8,
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
            }}>
              <img src="/logo.png" alt="Tryout CPNS Online" style={{ height: 30, width: "auto", display: "block" }} />
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={14} style={{ color: "#fca5a5" }} />
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
              Admin
            </span>
          </div>
          <button
            className="ml-auto lg:hidden text-white/70 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          {adminNavItems.map((item) => {
            const isActive =
              location.startsWith(item.href) &&
              (item.href !== "/admin/dashboard" || location === "/admin/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
                style={{
                  background:  isActive ? BLUE_ACT : "transparent",
                  color:       isActive ? "#fff"   : "rgba(255,255,255,0.72)",
                  borderLeft:  isActive ? "3px solid rgba(255,255,255,0.85)" : "3px solid transparent",
                }}
              >
                <item.icon
                  size={16}
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.60)" }}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User footer */}
        <div
          className="p-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.12)", background: BLUE_D }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              {(user?.name ?? "A")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.name ?? "Administrator"}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.50)" }}>Admin Panel</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ color: "#fca5a5" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={15} /> Keluar Sistem
          </button>
        </div>
      </aside>

      {/* ====== MAIN ====== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-8 shrink-0 z-30 shadow-sm">
          <button
            className="mr-4 lg:hidden"
            style={{ color: "#64748b" }}
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <ShieldAlert size={16} style={{ color: BLUE }} />
            <h1 className="font-semibold capitalize" style={{ color: "#0f172a" }}>
              {pageLabel}
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
