import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, differenceInDays } from 'date-fns';
import { Expense } from '../../types';
import { useAppStore } from '../../lib/store';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  expenses: Expense[];
}

export const Calendar: React.FC = () => {
  const { expenses } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const calculateNextDueDate = (expense: Expense, referenceDate: Date): Date | null => {
    
    if (expense.billing.due_day) {
      let nextDue = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), expense.billing.due_day);
      
      switch (expense.billing.frequency) {
        case 'daily':
          nextDue = referenceDate;
          break;
        case 'weekly':
          nextDue = addDays(referenceDate, (expense.billing.due_day - referenceDate.getDay() + 7) % 7);
          break;
        case 'monthly':
          if (nextDue <= referenceDate) {
            nextDue.setMonth(nextDue.getMonth() + 1);
          }
          break;
        case 'quarterly':
          if (nextDue <= referenceDate) {
            nextDue.setMonth(nextDue.getMonth() + 3);
          }
          break;
        case 'yearly':
          if (nextDue <= referenceDate) {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
          }
          break;
      }
    }
    return nextDue;
  };

  const getExpensesForDate = (date: Date): Expense[] => {
    return expenses.filter(expense => {
      if (expense.status !== 'active') return false;

      const nextDue = calculateNextDueDate(expense, date);
      return nextDue && isSameDay(nextDue, date);
    });
  };

  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: CalendarDay[] = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const dayExpenses = getExpensesForDate(currentDate);
      
      days.push({
        date: currentDate,
        isCurrentMonth: isSameMonth(currentDate, monthStart),
        expenses: dayExpenses,
      });

      currentDate = addDays(currentDate, 1);
    }

    setCalendarDays(days);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(null);
  };

  const getMonthTotal = () => {
    return calendarDays
      .filter(day => day.isCurrentMonth)
      .reduce((total, day) => {
        return day.expenses.reduce((dayTotal, expense) => dayTotal + expense.cost.amount, 0);
      }, 0);
  };

  const getUrgencyColor = (date: Date): string => {
    const upcomingExpenses = calendarDays
      .filter(day => isSameDay(day.date, date))
      .flatMap(day => day.expenses);

    if (upcomingExpenses.length === 0) return 'text-gray-400';
    
    const hasOverdue = upcomingExpenses.some(expense => {
      const nextDue = calculateNextDueDate(expense, date);
      return nextDue && nextDue < date;
    });

    return hasOverdue ? 'text-red-500' : 'text-orange-500';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">Calendar</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">View your expense obligations over time</p>
        </div>
        <button
          onClick={handleToday}
          className="bg-surface-container text-on-surface px-4 py-2 rounded-lg font-label-caps text-label-caps"
        >
          Today
        </button>
      </div>

      {/* Month Navigation */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-surface-container-low rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          <h3 className="font-headline-md text-headline-md text-on-surface">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-surface-container-low rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center font-label-caps text-label-caps text-on-surface-variant py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors
                ${day.isCurrentMonth ? 'bg-surface border-outline-variant' : 'bg-surface-container border-outline-variant/30'}
                ${selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-primary' : ''}
                ${day.expenses.length > 0 ? 'hover:border-primary' : 'hover:border-outline-variant'}
              `}
              onClick={() => setSelectedDate(day.date)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`
                  font-body-sm text-body-sm
                  ${day.isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant'}
                  ${day.expenses.length > 0 ? getUrgencyColor(day.date) : ''}
                `}>
                  {format(day.date, 'd')}
                </span>
                {day.expenses.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-sm">payments</span>
                    <span className="font-label-caps text-label-caps text-primary">
                      {day.expenses.length}
                    </span>
                  </div>
                )}
              </div>
              
              {day.expenses.length > 0 && (
                <div className="space-y-1">
                  {day.expenses.slice(0, 2).map((expense, i) => (
                    <div
                      key={i}
                      className="font-body-sm text-body-sm truncate bg-primary-container text-on-primary-container px-1 py-0.5 rounded"
                      title={expense.name}
                    >
                      {expense.name}
                    </div>
                  ))}
                  {day.expenses.length > 2 && (
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      +{day.expenses.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Month Summary */}
        <div className="mt-6 pt-6 border-t border-outline-variant">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Monthly Total:
              </span>
              <span className="font-data-tabular text-data-tabular text-primary">
                {formatCurrency(getMonthTotal())}
              </span>
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              {calendarDays.filter(day => day.isCurrentMonth && day.expenses.length > 0).length} payment days
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (() => {
        const selectedDayExpenses = getExpensesForDate(selectedDate);
        return (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
            <h3 className="font-headline-md text-headline-md text-primary mb-4">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            
            {selectedDayExpenses.length > 0 ? (
              <div className="space-y-3">
                {selectedDayExpenses.map((expense: Expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-surface-container rounded-lg"
                  >
                    <div>
                      <div className="font-body-base text-body-base text-on-surface">{expense.name}</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        {expense.category.join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-data-tabular text-data-tabular text-on-surface">
                        {formatCurrency(expense.cost.amount, expense.cost.currency)}
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        {expense.billing.frequency}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t border-outline-variant">
                  <div className="flex justify-between items-center">
                    <span className="font-body-base text-body-base text-on-surface">Day Total:</span>
                    <span className="font-data-tabular text-data-tabular text-primary">
                      {formatCurrency(selectedDayExpenses.reduce((total, expense) => total + expense.cost.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">calendar_today</span>
                <p className="font-body-base text-body-base text-on-surface-variant">No expenses scheduled for this date</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Upcoming Payments Summary */}
      {(() => {
        const today = new Date();
        const upcomingExpenses = expenses
          .filter(expense => expense.status === 'active')
          .map(expense => ({
            expense,
            nextDue: calculateNextDueDate(expense, today)
          }))
          .filter(item => item.nextDue && item.nextDue >= today)
          .sort((a, b) => (a.nextDue?.getTime() || 0) - (b.nextDue?.getTime() || 0))
          .slice(0, 5);
        
        return (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
            <h3 className="font-headline-md text-headline-md text-primary mb-4">Upcoming Payments</h3>
            
            {upcomingExpenses.length > 0 ? (
              <div className="space-y-3">
                {upcomingExpenses.map(({ expense, nextDue }) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-surface-container rounded-lg"
                  >
                    <div>
                      <div className="font-body-base text-body-base text-on-surface">{expense.name}</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        {nextDue && format(nextDue, 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-data-tabular text-data-tabular text-on-surface">
                        {formatCurrency(expense.cost.amount, expense.cost.currency)}
                      </div>
                      {nextDue && (
                        <div className={`font-body-sm text-body-sm ${getUrgencyColor(nextDue)}`}>
                          {differenceInDays(nextDue, today)} days
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">event_busy</span>
                <p className="font-body-base text-body-base text-on-surface-variant">No upcoming payments found</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
