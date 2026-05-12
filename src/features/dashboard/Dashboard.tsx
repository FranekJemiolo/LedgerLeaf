import React, { useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Bell,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { Expense } from '../../types';
import { useAppStore } from '../../lib/store';

export const Dashboard: React.FC = () => {
  const { dashboardStats, expenses, calculateDashboardStats, setSelectedExpense } = useAppStore();

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

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-600 bg-red-50';
    if (daysUntil <= 3) return 'text-orange-600 bg-orange-50';
    if (daysUntil <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getUrgencyText = (daysUntil: number) => {
    if (daysUntil < 0) return 'Overdue';
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    if (daysUntil <= 7) return `Due in ${daysUntil} days`;
    return `Due in ${daysUntil} days`;
  };

  const calculateNextDue = (expense: Expense) => {
    const now = new Date();
    let nextDue = new Date();
    
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your recurring expenses and obligations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Monthly Recurring */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Recurring</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardStats.totalMonthlyRecurring)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming (30 days)</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.upcomingPayments.length}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Overdue Items */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.overdueItems.length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Unused Services */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Potentially Unused</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.potentiallyUnusedServices.length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Bell className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Payments */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Payments</h2>
            <p className="text-sm text-gray-600">Next 30 days</p>
          </div>
          <div className="p-6">
            {upcomingPaymentsWithDays.length > 0 ? (
              <div className="space-y-4">
                {upcomingPaymentsWithDays.slice(0, 5).map(({ expense, daysUntil }) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => setSelectedExpense(expense.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{expense.name}</div>
                      <div className="text-sm text-gray-600">
                        {expense.category.join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(expense.cost.amount, expense.cost.currency)}
                      </div>
                      <div className={`text-sm px-2 py-1 rounded-full inline-block ${getUrgencyColor(daysUntil)}`}>
                        {getUrgencyText(daysUntil)}
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingPaymentsWithDays.length > 5 && (
                  <div className="text-center pt-4">
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      View all upcoming payments
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No upcoming payments in the next 30 days</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Category Breakdown</h2>
            <p className="text-sm text-gray-600">Monthly spending by category</p>
          </div>
          <div className="p-6">
            {Object.keys(dashboardStats.categoryBreakdown).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(dashboardStats.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([category, amount]) => {
                    const percentage = (amount / dashboardStats.totalMonthlyRecurring) * 100;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">{category}</span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No categories to display</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Sections */}
      {(dashboardStats.overdueItems.length > 0 || dashboardStats.potentiallyUnusedServices.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Items */}
          {dashboardStats.overdueItems.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200">
              <div className="p-6 border-b border-red-200 bg-red-50">
                <h2 className="text-lg font-semibold text-red-900">Overdue Items</h2>
                <p className="text-sm text-red-700">Immediate attention required</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardStats.overdueItems.slice(0, 3).map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
                      onClick={() => setSelectedExpense(expense.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-red-900">{expense.name}</div>
                        <div className="text-sm text-red-700">
                          {expense.category.join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-900">
                          {formatCurrency(expense.cost.amount, expense.cost.currency)}
                        </div>
                        <div className="text-sm text-red-700">Overdue</div>
                      </div>
                    </div>
                  ))}
                  {dashboardStats.overdueItems.length > 3 && (
                    <div className="text-center pt-4">
                      <button className="text-red-600 hover:text-red-700 font-medium">
                        View all overdue items
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Potentially Unused Services */}
          {dashboardStats.potentiallyUnusedServices.length > 0 && (
            <div className="bg-white rounded-lg border border-yellow-200">
              <div className="p-6 border-b border-yellow-200 bg-yellow-50">
                <h2 className="text-lg font-semibold text-yellow-900">Potentially Unused Services</h2>
                <p className="text-sm text-yellow-700">Review these subscriptions</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardStats.potentiallyUnusedServices.slice(0, 3).map((expense) => {
                    const daysSinceConfirmation = expense.usage_tracking.last_confirmed_use
                      ? differenceInDays(new Date(), new Date(expense.usage_tracking.last_confirmed_use))
                      : null;
                    
                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
                        onClick={() => setSelectedExpense(expense.id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-yellow-900">{expense.name}</div>
                          <div className="text-sm text-yellow-700">
                            {daysSinceConfirmation
                              ? `Last used ${daysSinceConfirmation} days ago`
                              : 'Never confirmed usage'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-yellow-900">
                            {formatCurrency(expense.cost.amount, expense.cost.currency)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle usage confirmation
                            }}
                            className="text-sm text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirm usage
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {dashboardStats.potentiallyUnusedServices.length > 3 && (
                    <div className="text-center pt-4">
                      <button className="text-yellow-600 hover:text-yellow-700 font-medium">
                        View all potentially unused services
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
