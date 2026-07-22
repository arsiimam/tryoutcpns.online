import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileQuestion, BookOpen, Clock, Settings, CreditCard, Tag, BarChart3, LogOut, Menu, X, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin/dashboard" },
  { icon: FileQuestion, label: "Bank Soal", href: "/admin/questions" },
  { icon: BookOpen, label: "Kategori", href: "/admin/categories" },
  { icon: Clock, label: "Tryout", href: "/admin/tryouts" },
  { icon: Users, label: "Pengguna", href: "/admin/users" },
  { icon: Star, label: "Paket Langganan", href: "/admin/subscriptions" },
  { icon: CreditCard, label: "Pembayaran", href: "/admin/payments" },
  { icon: Tag, label: "Kupon Promo", href: "/admin/coupons" },
  { icon: BarChart3, label: "Laporan", href: "/admin/reports" },
  { icon: Settings, label: "CMS Web", href: "/admin/cms" },
  { icon: SlidersHorizontal, label: "Pengaturan", href: "/admin/settings" },
];

import { Star } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 flex flex-col
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 bg-slate-950">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white rounded-md px-2 py-1">
              <img src="/logo.png" alt="Tryout CPNS Online" className="h-6 w-auto block" />
            </div>
            <span className="font-semibold text-sm text-slate-300">Admin Panel</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-slate-400"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = location.startsWith(item.href) && (item.href !== '/admin/dashboard' || location === '/admin/dashboard');
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm
                  ${isActive 
                    ? "bg-slate-800 text-white font-medium" 
                    : "hover:bg-slate-800/50 hover:text-white"}
                `}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon size={18} className={isActive ? "text-blue-400" : ""} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-950">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Administrator</div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={16} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-8 shrink-0 z-30 shadow-sm">
          <button 
            className="mr-4 lg:hidden text-slate-500 hover:text-slate-900"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <h1 className="font-semibold text-slate-800 capitalize">
            {location.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
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
