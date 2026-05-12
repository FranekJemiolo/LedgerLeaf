import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, differenceInDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, expenses]);

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

  const getExpensesForDate = (date: Date): Expense[] => {
    return expenses.filter(expense => {
      if (expense.status !== 'active') return false;

      const nextDue = calculateNextDueDate(expense, date);
      return nextDue && isSameDay(nextDue, date);
    });
  };

  const calculateNextDueDate = (expense: Expense, referenceDate: Date): Date | null => {
    const created = new Date(expense.metadata.created_at);
    
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
          if (nextDue < referenceDate) {
            nextDue.setMonth(nextDue.getMonth() + 1);
          }
          break;
        case 'quarterly':
          nextDue.setMonth(Math.floor((referenceDate.getMonth() / 3)) * 3);
          if (nextDue < referenceDate) {
            nextDue.setMonth(nextDue.getMonth() + 3);
          }
          break;
        case 'yearly':
          if (nextDue < referenceDate) {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
          }
          break;
      }

      return nextDue >= created ? nextDue : null;
    }

    return null;
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
    setSelectedDate(new Date());
  };

  const getDayTotal = (dayExpenses: Expense[]) => {
    return dayExpenses.reduce((total, expense) => total + expense.cost.amount, 0);
  };

  const getMonthTotal = () => {
    return calendarDays
      .filter(day => day.isCurrentMonth)
      .reduce((total, day) => total + getDayTotal(day.expenses), 0);
  };

  const getUrgencyColor = (date: Date) => {
    const today = new Date();
    const daysUntil = differenceInDays(date, today);
    
    if (daysUntil < 0) return 'text-red-600';
    if (daysUntil === 0) return 'text-orange-600';
    if (daysUntil <= 3) return 'text-yellow-600';
    if (daysUntil <= 7) return 'text-blue-600';
    return 'text-gray-600';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600">View your expense obligations over time</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToday}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
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
                ${day.isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}
                ${selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-blue-500' : ''}
                ${day.expenses.length > 0 ? 'hover:border-blue-300' : 'hover:border-gray-300'}
              `}
              onClick={() => setSelectedDate(day.date)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`
                  text-sm font-medium
                  ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${day.expenses.length > 0 ? getUrgencyColor(day.date) : ''}
                `}>
                  {format(day.date, 'd')}
                </span>
                {day.expenses.length > 0 && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">
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
                      className="text-xs truncate bg-blue-50 text-blue-700 px-1 py-0.5 rounded"
                      title={expense.name}
                    >
                      {expense.name}
                    </div>
                  ))}
                  {day.expenses.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{day.expenses.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Month Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">
                Monthly Total:
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(getMonthTotal())}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {calendarDays.filter(day => day.isCurrentMonth && day.expenses.length > 0).length} payment days
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (() => {
        const selectedDayExpenses = getExpensesForDate(selectedDate);
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            
            {selectedDayExpenses.length > 0 ? (
              <div className="space-y-3">
                {selectedDayExpenses.map((expense: Expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{expense.name}</div>
                      <div className="text-sm text-gray-600">
                        {expense.category.join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(expense.cost.amount, expense.cost.currency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {expense.billing.frequency}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Day Total:</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {formatCurrency(getDayTotal(selectedDayExpenses))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No expenses scheduled for this date</p>
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming Payments</h3>
            
            {upcomingExpenses.length > 0 ? (
              <div className="space-y-3">
                {upcomingExpenses.map(({ expense, nextDue }) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{expense.name}</div>
                      <div className="text-sm text-gray-600">
                        {nextDue && format(nextDue, 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(expense.cost.amount, expense.cost.currency)}
                      </div>
                      {nextDue && (
                        <div className={`text-sm ${getUrgencyColor(nextDue)}`}>
                          {differenceInDays(nextDue, today)} days
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No upcoming payments found</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
