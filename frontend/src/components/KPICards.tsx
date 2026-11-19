import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, ShieldAlert, BadgeCheck } from 'lucide-react';
import { DashboardKPIs } from '../types';

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const cards = [
    {
      title: 'Total Processed',
      value: kpis.total_processed,
      label: 'Invoices in ERP ledger',
      icon: FileText,
      gradient: 'from-blue-600/20 to-indigo-600/10',
      border: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      textColor: 'text-white'
    },
    {
      title: 'Queued for Payment',
      value: kpis.queued_for_payment,
      label: 'Clean 3-way match verified',
      icon: CheckCircle2,
      gradient: 'from-emerald-600/20 to-teal-600/10',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      textColor: 'text-emerald-300'
    },
    {
      title: 'Exceptions on Hold',
      value: kpis.exceptions_on_hold,
      label: 'Qty or price mismatch flagged',
      icon: AlertTriangle,
      gradient: 'from-rose-600/20 to-orange-600/10',
      border: 'border-rose-500/30',
      iconColor: 'text-rose-400',
      textColor: 'text-rose-300'
    },
    {
      title: 'Duplicates Blocked',
      value: kpis.duplicates_blocked,
      label: 'Protected from double-payment',
      icon: ShieldAlert,
      gradient: 'from-purple-600/20 to-pink-600/10',
      border: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      textColor: 'text-purple-300'
    },
    {
      title: 'Approved by AP',
      value: kpis.approved_for_payment,
      label: 'Manual AP sign-offs',
      icon: BadgeCheck,
      gradient: 'from-sky-600/20 to-cyan-600/10',
      border: 'border-sky-500/30',
      iconColor: 'text-sky-400',
      textColor: 'text-sky-300'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`relative overflow-hidden rounded-xl bg-slate-800/80 backdrop-blur-md p-4 border ${c.border} bg-gradient-to-br ${c.gradient} transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-black/20`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {c.title}
              </span>
              <div className={`p-2 rounded-lg bg-slate-900/60 border border-slate-700/50 ${c.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold tracking-tight ${c.textColor}`}>
                {c.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 truncate">
              {c.label}
            </p>
          </div>
        );
      })}
    </div>
  );
};
