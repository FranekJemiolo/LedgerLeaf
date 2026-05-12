import React, { useState } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Filter, Edit, Trash2, Eye } from 'lucide-react';
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
  const [showFilters, setShowFilters] = useState(false);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          
          <button
            onClick={onExpenseCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">All Categories</option>
                {/* Categories will be populated dynamically */}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => {
                const dueStatus = getDueStatus(expense);
                return (
                  <tr
                    key={expense.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedExpense(expense.id);
                      onExpenseSelect?.(expense);
                    }}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {expense.name}
                        </div>
                        {expense.notes && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {expense.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {expense.cost.currency} {expense.cost.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatFrequency(expense.billing.frequency, expense.billing.interval)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm ${dueStatus.color}`}>
                        {dueStatus.text}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {expense.category.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExpenseEdit?.(expense);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(expense);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpense(expense.id);
                            onExpenseSelect?.(expense);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
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
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || showFilters ? 'No expenses match your filters' : 'No expenses yet'}
            </div>
            {!searchTerm && !showFilters && (
              <button
                onClick={onExpenseCreate}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first expense
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
