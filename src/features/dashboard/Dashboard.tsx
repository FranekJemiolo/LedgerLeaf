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
        case 'weekly':
          const daysUntil = (expense.billing.due_day - now.getDay() + 7) % 7;
          nextDue.setDate(now.getDate() + daysUntil);
          break;
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

      {/* Monthly Summary Card */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant p-5 flex flex-col justify-between h-full">
          <div>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Monthly Estimated Recurring</h3>
            <div className="flex items-baseline gap-2">
              <span className="font-display-sm text-display-sm text-primary">
                {formatCurrency(dashboardStats.totalMonthlyRecurring)}
              </span>
              <span className="text-on-surface-variant font-body-sm text-body-sm">+4% vs last month</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span>Utilities</span>
              <span className="font-data-tabular text-data-tabular">
                {formatCurrency(dashboardStats.categoryBreakdown['Utilities'] || 0)}
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[34%]"></div>
            </div>
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span>Subscriptions</span>
              <span className="font-data-tabular text-data-tabular">
                {formatCurrency(dashboardStats.categoryBreakdown['Subscriptions'] || 0)}
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-[15%]"></div>
            </div>
          </div>
        </div>
        <div className="bg-primary-container text-on-primary-container p-5 flex flex-col justify-between">
          <h3 className="font-label-caps text-label-caps opacity-80 uppercase">Optimization Score</h3>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-24 h-24 flex items-center justify-center border-4 border-on-primary-container/20 rounded-full">
              <span className="font-display-sm text-display-sm text-on-primary">82</span>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle className="text-on-primary-container" cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="250 300" strokeWidth="4"></circle>
              </svg>
            </div>
          </div>
          <p className="text-body-sm font-body-sm opacity-90 text-center">Saving $12/mo could improve your score.</p>
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

      {/* Decorative Aesthetic Image */}
      <div className="rounded-xl overflow-hidden h-40 w-full relative group">
        <img 
          alt="Financial overview" 
          className="w-full h-full object-cover grayscale opacity-80" 
          src="https://via.placeholder.com/400x200/f7f9fb/1d2b3e?text=Financial+Overview"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent flex items-end p-4">
          <p className="text-white font-label-caps text-label-caps">Financial Clarity Achieved.</p>
        </div>
      </div>
    </div>
  );
};
