import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, CheckCircle, BarChart2, TrendingUp, Trophy, Star, CreditCard, User as UserIcon, LogOut, Menu, X, ChevronRight, PlayCircle } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: PlayCircle, label: "Tryout CAT", href: "/tryout" },
  { icon: FileText, label: "Latihan Soal", href: "/latihan" },
  { icon: BarChart2, label: "Hasil & Analisis", href: "/hasil" },
  { icon: CheckCircle, label: "Review Soal", href: "/review" },
  { icon: Trophy, label: "Ranking Nasional", href: "/ranking" },
  { icon: Star, label: "Langganan Premium", href: "/subscription" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground 
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 flex flex-col
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-primary font-bold">
              S
            </div>
            <span className="font-bold text-lg tracking-tight">SiapCPNS</span>
          </div>
          <button 
            className="ml-auto md:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-white/50 px-3 mb-2 uppercase tracking-wider">Menu Belajar</div>
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href) && (item.href !== '/dashboard' || location === '/dashboard');
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors
                  ${isActive 
                    ? "bg-white/10 text-white font-medium" 
                    : "text-white/70 hover:bg-white/5 hover:text-white"}
                `}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon size={18} className={isActive ? "text-accent" : ""} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-accent">
              {user?.avatar || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-white/50 truncate capitalize">{user?.role}</div>
            </div>
          </div>
          <div className="space-y-1">
            <Link 
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <UserIcon size={16} />
              <span>Profil Saya</span>
            </Link>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-4 md:px-8 shrink-0 z-30">
          <button 
            className="mr-4 md:hidden text-slate-500 hover:text-slate-900"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center text-sm text-slate-500 gap-2">
            <span>SiapCPNS</span>
            <ChevronRight size={14} />
            <span className="font-medium text-slate-900 capitalize">
              {location.split('/')[1] || 'Dashboard'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
              <Star size={14} className="fill-amber-500" />
              Paket {user?.subscriptionId ? 'Premium' : 'Gratis'}
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
