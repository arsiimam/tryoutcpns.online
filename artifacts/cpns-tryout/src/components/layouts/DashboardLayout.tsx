import React from "react";
import { Link, useLocation } from "wouter";
import { BrandLogo } from "../BrandLogo";
import {
  LayoutDashboard, FileText, CheckCircle, BarChart2,
  Trophy, Star, User as UserIcon, LogOut, Menu, X,
  ChevronRight, PlayCircle,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const BLUE     = "#1E4D9C";   // Deep Royal Blue
const BLUE_D   = "#0A1C3C";   // Dark Indigo — header/footer strip
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const initial = (user?.name ?? "U")[0].toUpperCase();
  const pageName = location.split("/")[1] || "dashboard";

  // Toggle: on mobile open drawer, on desktop collapse sidebar
  function handleHamburger() {
    if (window.innerWidth < 768) {
      setIsMobileOpen(o => !o);
    } else {
      setIsSidebarCollapsed(o => !o);
    }
  }

  // Close dropdown on outside click
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ====== SIDEBAR ====== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col
          transform transition-all duration-200 ease-in-out
          md:relative md:translate-x-0 shrink-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${isSidebarCollapsed ? "md:w-0 md:overflow-hidden" : "w-64"}`}
        style={{ background: BLUE }}
      >
        {/* Logo strip */}
        <div
          className="h-16 flex items-center px-5 shrink-0"
          style={{ background: BLUE_D, borderBottom: "1px solid rgba(255,255,255,0.12)" }}
        >
          <Link href="/" className="flex items-center">
            <BrandLogo variant="dark" size="md" />
          </Link>
          <button
            className="ml-auto md:hidden text-white/70 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
          {/* Desktop collapse button (inside sidebar) */}
          <button
            className="ml-auto hidden md:flex text-white/70 hover:text-white"
            onClick={() => setIsSidebarCollapsed(true)}
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

      </aside>

      {/* ====== MAIN ====== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="h-16 flex items-center px-4 md:px-8 shrink-0 z-30 shadow-md"
          style={{ background: "#1E4D9C" }}
        >
          <button
            className="mr-4"
            style={{ color: "rgba(255,255,255,0.80)" }}
            onClick={handleHamburger}
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center text-sm gap-2" style={{ color: "rgba(255,255,255,0.70)" }}>
            <span>Tryout CPNS</span>
            <ChevronRight size={14} />
            <span className="font-semibold capitalize" style={{ color: "#fff" }}>
              {pageName}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Subscription badge */}
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                background:  user?.subscriptionId ? "rgba(230,177,52,0.18)" : "rgba(255,255,255,0.12)",
                color:       user?.subscriptionId ? "#E6B134" : "rgba(255,255,255,0.80)",
                borderColor: user?.subscriptionId ? "rgba(230,177,52,0.45)" : "rgba(255,255,255,0.20)",
              }}
            >
              <Star size={13} className={user?.subscriptionId ? "fill-[#E6B134]" : "fill-white/60"} />
              {user?.subscriptionId ? "Premium" : "Paket Gratis"}
            </div>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.10)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: "#E6B134", color: "#0A1C3C" }}
                >
                  {initial}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold leading-tight" style={{ color: "#fff" }}>{user?.name}</div>
                  <div className="text-xs capitalize leading-tight" style={{ color: "rgba(255,255,255,0.65)" }}>{user?.role}</div>
                </div>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50"
                  style={{ top: "100%" }}
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="font-semibold text-sm text-slate-900 truncate">{user?.name}</div>
                    <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <UserIcon size={15} /> Profil Saya
                  </Link>
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} /> Keluar
                  </button>
                </div>
              )}
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
