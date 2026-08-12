import React from "react";
import { Link, useLocation } from "wouter";
import { BrandLogo } from "../BrandLogo";
import {
  LayoutDashboard, Users, FileQuestion, BookOpen, Clock,
  Settings, CreditCard, Tag, BarChart3, LogOut, Menu, X,
  ShieldAlert, SlidersHorizontal, Star, Bell,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const BLUE     = "#1E4D9C";   // Deep Royal Blue
const BLUE_D   = "#0A1C3C";   // Dark Indigo — header/footer strip
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
  { icon: Bell,              label: "Notifikasi",         href: "/admin/notifications" },
  { icon: BarChart3,         label: "Laporan",            href: "/admin/reports" },
  { icon: Settings,          label: "CMS Web",            href: "/admin/cms" },
  { icon: SlidersHorizontal, label: "Pengaturan",         href: "/admin/settings" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const pageSlug = location.split("/").pop() ?? "dashboard";
  const pageLabel = pageSlug.replace(/-/g, " ");

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#EFEFEF" }}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====== SIDEBAR ====== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col
          transform transition-all duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: BLUE,
          width: isCollapsed ? 56 : 256,
          minWidth: isCollapsed ? 56 : 256,
        }}
      >
        {/* Logo strip */}
        <div
          className="h-16 flex items-center shrink-0"
          style={{
            background: BLUE,
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            padding: isCollapsed ? "0 0" : "0 12px 0 20px",
            justifyContent: isCollapsed ? "center" : "space-between",
          }}
        >
          {!isCollapsed && (
            <Link href="/" className="flex items-center">
              <BrandLogo variant="dark" size="md" />
            </Link>
          )}
          {/* Hamburger — desktop toggle / mobile close */}
          <button
            className="text-white/70 hover:text-white transition-colors rounded-md p-1.5 hover:bg-white/10"
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setIsCollapsed(c => !c);
              } else {
                setIsMobileOpen(false);
              }
            }}
            title={isCollapsed ? "Buka sidebar" : "Lipat sidebar"}
          >
            <Menu size={20} />
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
                title={isCollapsed ? item.label : undefined}
                className="flex items-center gap-3 rounded-lg transition-all text-sm font-medium"
                style={{
                  background:     isActive ? BLUE_ACT : "transparent",
                  color:          isActive ? "#fff"   : "rgba(255,255,255,0.72)",
                  borderLeft:     isActive ? "3px solid rgba(255,255,255,0.85)" : "3px solid transparent",
                  padding:        isCollapsed ? "10px 0" : "10px 12px",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                }}
              >
                <item.icon
                  size={17}
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.60)", flexShrink: 0 }}
                />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
        </div>

      </aside>

      {/* ====== MAIN ====== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="h-16 flex items-center px-4 lg:px-8 shrink-0 z-30"
          style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}
        >
          <button
            className="mr-4 lg:hidden"
            style={{ color: "#64748b" }}
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <ShieldAlert size={16} style={{ color: "#1E4D9C" }} />
            <h1 className="font-semibold capitalize" style={{ color: "#0f172a" }}>
              {pageLabel}
            </h1>
          </div>

          {/* User dropdown — top right */}
          <div className="ml-auto relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={e => (e.currentTarget.style.background = "#f8fafc")}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: "#E6B134", color: "#0A1C3C" }}
              >
                {(user?.name ?? "A")[0].toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold leading-tight" style={{ color: "#0f172a" }}>
                  {user?.name ?? "Administrator"}
                </div>
                <div className="text-xs leading-tight" style={{ color: "#64748b" }}>Admin Panel</div>
              </div>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50"
                style={{ top: "100%" }}
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="font-semibold text-sm text-slate-900 truncate">{user?.name ?? "Administrator"}</div>
                  <div className="text-xs text-slate-400">Admin Panel</div>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} /> Keluar Sistem
                </button>
              </div>
            )}
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
