import React from "react";
import { Link } from "wouter";
import { cn } from "../../lib/utils";

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  subtitle,
  className 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  trend?: string; 
  trendUp?: boolean; 
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-white p-6 rounded-xl border shadow-sm", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-slate-500 font-medium text-sm">{title}</div>
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Icon size={20} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      {(trend || subtitle) && (
        <div className="text-sm">
          {trend && (
            <span className={cn(
              "font-medium mr-2", 
              trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
          <span className="text-slate-500">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ 
  status, 
  className 
}: { 
  status: string; 
  className?: string;
}) {
  const getVariants = (s: string) => {
    switch (s.toLowerCase()) {
      case 'success':
      case 'active':
      case 'published':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
      case 'in_progress':
      case 'draft':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'failed':
      case 'expired':
      case 'cancelled':
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatText = (s: string) => s.replace('_', ' ').toUpperCase();

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border", getVariants(status), className)}>
      {formatText(status)}
    </span>
  );
}

export function PageHeader({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description?: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
