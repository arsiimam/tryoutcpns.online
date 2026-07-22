import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileText, CheckCircle, BarChart2,
  Trophy, Star, User as UserIcon, LogOut, Menu, X,
  ChevronRight, PlayCircle,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const BLUE     = "#4f5eea";
const BLUE_D   = "#4147d5";   // header strip & footer strip
const BLUE_ACT = "rgba(255,255,255,0.18)"; // active item bg
const BLUE_HOV = "rgba(255,255,255,0.09)"; // hover item bg

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",        href: "/dashboard" },
  { icon: PlayCircle,      label: "Tryout CAT",       href: "/tryout" },
  { icon: FileText,        label: "Latihan Soal",      href: "/latihan" },
  { icon: BarChart2,       label: "Hasil & Analisis",  href: "/hasil" },
  { icon: CheckCircle,     label: "Review Soal",       href: "/review" },
  { icon: Trophy,          label: "Ranking Nasional",  href: "/ranking" },
  { icon: Star,            label: "Langganan Premium", href: "/subscription" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const initial = (user?.name ?? "U")[0].toUpperCase();
  const pageName = location.split("/")[1] || "dashboard";

  return (
    <div className="min-h-screen flex" style={{ background: "#f6f7fc" }}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====== SIDEBAR ====== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: BLUE }}
      >
        {/* Logo strip */}
        <div
          className="h-16 flex items-center px-5 shrink-0"
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
              <img src="/logo.png" alt="Tryout CPNS Online" style={{ height: 32, width: "auto", display: "block" }} />
            </div>
          </Link>
          <button
            className="ml-auto md:hidden text-white/70 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          <div
            className="text-xs font-semibold px-3 mb-3 uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Menu Belajar
          </div>

          {navItems.map((item) => {
            const isActive =
              location.startsWith(item.href) &&
              (item.href !== "/dashboard" || location === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium"
                style={{
                  background:     isActive ? BLUE_ACT : "transparent",
                  color:          isActive ? "#fff"   : "rgba(255,255,255,0.72)",
                  borderLeft:     isActive ? "3px solid rgba(255,255,255,0.85)" : "3px solid transparent",
                }}
              >
                <item.icon
                  size={17}
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }}
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
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
              <div className="text-xs capitalize truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                {user?.role}
              </div>
            </div>
          </div>
          <div className="space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: "rgba(255,255,255,0.70)" }}
              onMouseEnter={e => (e.currentTarget.style.background = BLUE_HOV)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <UserIcon size={15} /> Profil Saya
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: "#fca5a5" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* ====== MAIN ====== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center px-4 md:px-8 shrink-0 z-30 shadow-sm">
          <button
            className="mr-4 md:hidden"
            style={{ color: "#64748b" }}
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center text-sm gap-2" style={{ color: "#64748b" }}>
            <span>Tryout CPNS</span>
            <ChevronRight size={14} />
            <span className="font-semibold capitalize" style={{ color: "#0f172a" }}>
              {pageName}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                background: user?.subscriptionId ? "#eef1ff" : "#fff7ed",
                color:      user?.subscriptionId ? "#4147d5" : "#92400e",
                borderColor:user?.subscriptionId ? "#c7d2fe" : "#fde68a",
              }}
            >
              <Star size={13} className={user?.subscriptionId ? "fill-[#4f5eea]" : "fill-amber-400"} />
              {user?.subscriptionId ? "Premium" : "Paket Gratis"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
