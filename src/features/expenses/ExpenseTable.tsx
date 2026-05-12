import React, { useState } from 'react';
import { format } from 'date-fns';
import { Expense, Frequency } from '../../types';
import { useAppStore, useFilteredExpenses } from '../../lib/store';

interface ExpenseTableProps {
  onExpenseSelect?: (expense: Expense) => void;
  onExpenseEdit?: (expense: Expense) => void;
  onExpenseCreate?: () => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  onExpenseSelect,
  onExpenseEdit,
  onExpenseCreate,
}) => {
  const filteredExpenses = useFilteredExpenses();
  const { deleteExpense, setSelectedExpense } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    useAppStore.getState().updateFilter({ search: value });
  };

  const handleDelete = async (expense: Expense) => {
    if (window.confirm(`Are you sure you want to delete "${expense.name}"?`)) {
      await deleteExpense(expense.id);
    }
  };

  const formatFrequency = (frequency: Frequency, interval: number) => {
    if (interval === 1) return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    return `Every ${interval} ${frequency}s`;
  };

  
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

  const getDueStatus = (expense: Expense) => {
    const nextDue = calculateNextDue(expense);
    const now = new Date();
    const daysUntil = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { text: 'Overdue', color: 'text-red-600 font-semibold' };
    } else if (daysUntil <= 3) {
      return { text: `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`, color: 'text-orange-600' };
    } else if (daysUntil <= 7) {
      return { text: `Due in ${daysUntil} days`, color: 'text-yellow-600' };
    } else {
      return { text: format(nextDue, 'MMM d'), color: 'text-gray-600' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-primary">Inventory</h2>
          <button
            onClick={onExpenseCreate}
            className="bg-primary text-on-primary px-4 py-2 rounded flex items-center gap-2 font-label-caps text-label-caps uppercase"
          >
            <span className="material-symbols-outlined">add</span>
            Add
          </button>
        </div>
        
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Spreadsheet-style Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Next Due
                </th>
                <th className="px-4 py-3 text-right font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredExpenses.map((expense) => {
                const dueStatus = getDueStatus(expense);
                return (
                  <tr
                    key={expense.id}
                    className="hover:bg-surface-container-low cursor-pointer transition-colors h-table-row-height"
                    onClick={() => {
                      setSelectedExpense(expense.id);
                      onExpenseSelect?.(expense);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-body-base text-body-base text-on-surface">
                          {expense.name}
                        </div>
                        {expense.notes && (
                          <div className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-xs">
                            {expense.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {expense.category.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex px-2 py-1 font-body-sm text-body-sm bg-surface-container text-on-surface rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-body-sm text-body-sm text-on-surface">
                        {formatFrequency(expense.billing.frequency, expense.billing.interval)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-data-tabular text-data-tabular text-on-surface">
                        {expense.cost.currency} {expense.cost.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-body-sm text-body-sm ${dueStatus.color.includes('red') ? 'text-error' : dueStatus.color.includes('orange') ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        {dueStatus.text}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpenseEdit?.(expense);
                          }}
                          className="p-2 text-outline-variant hover:text-primary transition-colors rounded"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(expense);
                          }}
                          className="p-2 text-outline-variant hover:text-error transition-colors rounded"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredExpenses.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">receipt_long</span>
            <div className="font-body-base text-body-base text-on-surface-variant">
              {searchTerm ? 'No expenses match your search' : 'No expenses yet'}
            </div>
            {!searchTerm && (
              <button
                onClick={onExpenseCreate}
                className="mt-4 text-primary font-body-sm text-body-sm hover:underline"
              >
                Create your first expense
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={onExpenseCreate}
        className="fixed bottom-24 right-4 bg-primary text-on-primary w-14 h-14 rounded-full shadow-lg flex items-center justify-center md:hidden"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
};
