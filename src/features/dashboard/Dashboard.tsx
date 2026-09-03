import React, { useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { Expense } from '../../types';
import { useAppStore } from '../../lib/store';

export const Dashboard: React.FC = () => {
  const { dashboardStats, expenses, calculateDashboardStats } = useAppStore();

  useEffect(() => {
    calculateDashboardStats();
  }, [expenses, calculateDashboardStats]);

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  
  const calculateNextDue = (expense: Expense) => {
    const now = new Date();
    const nextDue = new Date();
    
    if (expense.billing.due_day) {
      nextDue.setDate(expense.billing.due_day);
      
      switch (expense.billing.frequency) {
        case 'monthly':
          if (nextDue <= now) {
            nextDue.setMonth(nextDue.getMonth() + 1);
          }
          break;
        case 'yearly':
          if (nextDue <= now) {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
          }
          break;
        case 'weekly': {
          const daysUntil = (expense.billing.due_day - now.getDay() + 7) % 7;
          nextDue.setDate(now.getDate() + daysUntil);
          break;
        }
        case 'quarterly':
          if (nextDue <= now) {
            nextDue.setMonth(nextDue.getMonth() + 3);
          }
          break;
        case 'daily':
          nextDue.setDate(now.getDate() + 1);
          break;
      }
    }
    
    return nextDue;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const upcomingPaymentsWithDays = dashboardStats.upcomingPayments.map(expense => {
    const nextDue = calculateNextDue(expense);
    const daysUntil = differenceInDays(nextDue, new Date());
    return { expense, nextDue, daysUntil };
  }).sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="space-y-6">
      {/* Overdue Warning */}
      {dashboardStats.overdueItems.length > 0 && (
        <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-lg flex items-start gap-4 shadow-sm">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div className="flex-1">
            <h2 className="font-headline-md text-headline-md leading-tight">Overdue Items</h2>
            <p className="font-body-sm text-body-sm mt-1">
              {dashboardStats.overdueItems[0]?.name} was due 2 days ago. Pay now to avoid service interruption.
            </p>
            <div className="mt-3 flex justify-between items-center border-t border-error/10 pt-3">
              <span className="font-data-tabular text-data-tabular font-bold">
                {formatCurrency(dashboardStats.overdueItems[0]?.cost.amount || 0)}
              </span>
              <button className="bg-primary text-on-primary px-4 py-1 rounded font-label-caps text-label-caps uppercase tracking-wider">
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary Card & Optimization Score */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-sm card-hover">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-label-caps text-label-caps text-slate-500 uppercase tracking-wider">Monthly Estimated Recurring</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                +4% vs last month
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(dashboardStats.totalMonthlyRecurring)}
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-slate-600 mb-1.5 font-medium">
                <span>Utilities</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(dashboardStats.categoryBreakdown['Utilities'] || 0)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-[34%] rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-slate-600 mb-1.5 font-medium">
                <span>Subscriptions</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(dashboardStats.categoryBreakdown['Subscriptions'] || 0)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[15%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 flex flex-col justify-between shadow-sm border border-slate-700/50 card-hover">
          <div className="flex items-center justify-between">
            <h3 className="font-label-caps text-label-caps text-slate-400 uppercase tracking-wider">Optimization Score</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Good</span>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-28 h-28 flex items-center justify-center border-4 border-slate-700 rounded-full">
              <span className="text-3xl font-extrabold text-white">82</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle className="text-emerald-400" cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="250 300" strokeWidth="4"></circle>
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-300 text-center font-medium">Saving $12/mo could improve your score to 90.</p>
        </div>
      </section>

      {/* Upcoming Payments Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-primary">Upcoming Payments</h3>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Next 7 Days</span>
        </div>
        <div className="border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant">
          {upcomingPaymentsWithDays.slice(0, 3).map(({ expense, daysUntil }) => (
            <div key={expense.id} className="flex items-center px-4 h-table-row-height hover:bg-surface-container-low transition-colors group">
              <div className="flex-1">
                <div className="font-body-base text-body-base text-on-surface">{expense.name}</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {calculateNextDue(expense).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps rounded`}>
                  {daysUntil <= 3 ? 'Low' : daysUntil <= 7 ? 'Medium' : 'Urgent'}
                </span>
                <div className="font-data-tabular text-data-tabular text-on-surface text-right min-w-[60px]">
                  {formatCurrency(expense.cost.amount)}
                </div>
                <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Potentially Unused */}
      <section className="space-y-4">
        <h3 className="font-headline-md text-headline-md text-primary">Potentially Unused</h3>
        <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-container-padding px-container-padding pb-2">
          {dashboardStats.potentiallyUnusedServices.slice(0, 2).map((expense) => (
            <div key={expense.id} className="min-w-[240px] bg-white border border-outline-variant p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-surface-container flex items-center justify-center rounded">
                  <span className="material-symbols-outlined text-primary">movie</span>
                </div>
                <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 text-xs font-semibold rounded">
                  30d Idle
                </span>
              </div>
              <div>
                <div className="font-body-base text-body-base">{expense.name}</div>
                <p className="text-body-sm text-body-sm text-on-surface-variant">No activity since July 12th.</p>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between border-t border-outline-variant/30">
                <span className="font-data-tabular text-data-tabular">
                  {formatCurrency(expense.cost.amount)}/mo
                </span>
                <button className="text-primary font-label-caps text-label-caps hover:underline">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Local-first privacy reassurance banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-2xl">shield</span>
          </div>
          <div>
            <h4 className="font-semibold text-lg text-white">100% Local-First & Private</h4>
            <p className="text-slate-300 text-sm">All obligations are stored on your device in human-readable YAML format.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Offline Ready
        </div>
      </div>
    </div>
  );
};
