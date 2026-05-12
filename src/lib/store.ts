import { create } from 'zustand';
import { Expense, Config, FilterState, SortState, DashboardStats } from '../types';
import { storageService } from '../storage';

interface AppState {
  // Data
  expenses: Expense[];
  config: Config;
  loading: boolean;
  error: string | null;
  
  // UI State
  selectedExpenseId: string | null;
  filterState: FilterState;
  sortState: SortState;
  dashboardStats: DashboardStats | null;
  
  // Actions
  initializeApp: () => Promise<void>;
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'metadata'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setSelectedExpense: (id: string | null) => void;
  updateFilter: (filters: Partial<FilterState>) => void;
  updateSort: (sort: SortState) => void;
  calculateDashboardStats: () => void;
  updateConfig: (config: Partial<Config>) => Promise<void>;
  confirmUsage: (expenseId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  expenses: [],
  config: {
    currency: 'USD',
    default_reminder_days: 3,
    default_unused_days: 45,
    app_data_directory: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  loading: false,
  error: null,
  selectedExpenseId: null,
  filterState: {
    search: '',
    categories: [],
    status: [],
    frequency: [],
    tags: [],
  },
  sortState: {
    field: 'name',
    direction: 'asc',
  },
  dashboardStats: null,

  // Actions
  initializeApp: async () => {
    set({ loading: true, error: null });
    try {
      await storageService.initialize();
      const config = await storageService.loadConfig();
      const expenses = await storageService.loadAllExpenses();
      
      set({ 
        config, 
        expenses, 
        loading: false 
      });
      
      get().calculateDashboardStats();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize app',
        loading: false 
      });
    }
  },

  loadExpenses: async () => {
    set({ loading: true, error: null });
    try {
      const expenses = await storageService.loadAllExpenses();
      set({ expenses, loading: false });
      get().calculateDashboardStats();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load expenses',
        loading: false 
      });
    }
  },

  addExpense: async (expenseData) => {
    set({ loading: true, error: null });
    try {
      const expense = await storageService.createExpense(expenseData);
      const expenses = [...get().expenses, expense];
      set({ expenses, loading: false });
      get().calculateDashboardStats();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add expense',
        loading: false 
      });
    }
  },

  updateExpense: async (expense) => {
    set({ loading: true, error: null });
    try {
      await storageService.saveExpense(expense);
      const expenses = get().expenses.map(e => e.id === expense.id ? expense : e);
      set({ expenses, loading: false });
      get().calculateDashboardStats();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update expense',
        loading: false 
      });
    }
  },

  deleteExpense: async (id) => {
    set({ loading: true, error: null });
    try {
      await storageService.deleteExpense(id);
      const expenses = get().expenses.filter(e => e.id !== id);
      set({ expenses, loading: false });
      get().calculateDashboardStats();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete expense',
        loading: false 
      });
    }
  },

  setSelectedExpense: (id) => {
    set({ selectedExpenseId: id });
  },

  updateFilter: (filters) => {
    set({ filterState: { ...get().filterState, ...filters } });
  },

  updateSort: (sort) => {
    set({ sortState: sort });
  },

  calculateDashboardStats: () => {
    const { expenses } = get();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Calculate monthly recurring total
    const monthlyExpenses = expenses.filter(expense => 
      expense.status === 'active' && 
      expense.billing.frequency === 'monthly'
    );
    const totalMonthlyRecurring = monthlyExpenses.reduce(
      (total, expense) => total + expense.cost.amount, 
      0
    );

    // Find upcoming payments (within 30 days)
    const upcomingPayments = expenses.filter(expense => {
      if (expense.status !== 'active') return false;
      
      // Calculate next due date based on billing frequency
      let nextDue = new Date();
      if (expense.billing.due_day) {
        nextDue.setDate(expense.billing.due_day);
        if (nextDue < now) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        }
      }
      
      return nextDue <= thirtyDaysFromNow;
    });

    // Find overdue items
    const overdueItems = expenses.filter(expense => {
      if (expense.status !== 'active') return false;
      
      // Check if it's overdue based on billing
      let lastDue = new Date();
      if (expense.billing.due_day) {
        lastDue.setDate(expense.billing.due_day);
        lastDue.setMonth(lastDue.getMonth() - 1);
      }
      
      return lastDue < now;
    });

    // Find potentially unused services
    const potentiallyUnusedServices = expenses.filter(expense => {
      if (!expense.usage_tracking.enabled || expense.status !== 'active') return false;
      
      const lastConfirmed = expense.usage_tracking.last_confirmed_use;
      if (!lastConfirmed) return true;
      
      const daysSinceConfirmation = Math.floor(
        (now.getTime() - new Date(lastConfirmed).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return daysSinceConfirmation > expense.usage_tracking.remind_after_days_unused;
    });

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses
      .filter(expense => expense.status === 'active')
      .forEach(expense => {
        expense.category.forEach(cat => {
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + expense.cost.amount;
        });
      });

    const dashboardStats: DashboardStats = {
      totalMonthlyRecurring,
      upcomingPayments,
      overdueItems,
      potentiallyUnusedServices,
      categoryBreakdown,
    };

    set({ dashboardStats });
  },

  updateConfig: async (configUpdate) => {
    set({ loading: true, error: null });
    try {
      const updatedConfig = { ...get().config, ...configUpdate };
      await storageService.saveConfig(updatedConfig);
      set({ config: updatedConfig, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update config',
        loading: false 
      });
    }
  },

  confirmUsage: async (expenseId) => {
    set({ loading: true, error: null });
    try {
      const expense = get().expenses.find(e => e.id === expenseId);
      if (!expense) {
        throw new Error('Expense not found');
      }

      const updatedExpense = {
        ...expense,
        usage_tracking: {
          ...expense.usage_tracking,
          last_confirmed_use: new Date().toISOString(),
        },
        metadata: {
          ...expense.metadata,
          updated_at: new Date().toISOString(),
        },
      };

      await storageService.saveExpense(updatedExpense);
      const expenses = get().expenses.map(e => e.id === expenseId ? updatedExpense : e);
      set({ expenses, loading: false });
      get().calculateDashboardStats();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to confirm usage',
        loading: false 
      });
    }
  },
}));

// Selectors
export const useExpenses = () => useAppStore(state => state.expenses);
export const useConfig = () => useAppStore(state => state.config);
export const useLoading = () => useAppStore(state => state.loading);
export const useError = () => useAppStore(state => state.error);
export const useSelectedExpense = () => useAppStore(state => 
  state.expenses.find(e => e.id === state.selectedExpenseId)
);
export const useFilteredExpenses = () => {
  const { expenses, filterState, sortState } = useAppStore();
  
  return expenses
    .filter(expense => {
      // Search filter
      if (filterState.search) {
        const searchLower = filterState.search.toLowerCase();
        return (
          expense.name.toLowerCase().includes(searchLower) ||
          expense.notes?.toLowerCase().includes(searchLower) ||
          expense.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      return true;
    })
    .filter(expense => {
      // Category filter
      if (filterState.categories.length > 0) {
        return filterState.categories.some(cat => expense.category.includes(cat));
      }
      return true;
    })
    .filter(expense => {
      // Status filter
      if (filterState.status.length > 0) {
        return filterState.status.includes(expense.status);
      }
      return true;
    })
    .filter(expense => {
      // Frequency filter
      if (filterState.frequency.length > 0) {
        return filterState.frequency.includes(expense.billing.frequency);
      }
      return true;
    })
    .filter(expense => {
      // Tags filter
      if (filterState.tags.length > 0) {
        return filterState.tags.some(tag => expense.tags.includes(tag));
      }
      return true;
    })
    .sort((a, b) => {
      // Sort
      const aValue = a[sortState.field];
      const bValue = b[sortState.field];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortState.direction === 'desc' ? -comparison : comparison;
    });
};
