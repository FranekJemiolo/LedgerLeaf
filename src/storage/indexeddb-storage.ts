/* eslint-disable no-undef */
import { Expense, ExpenseSchema, Config, ConfigSchema } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'LedgerLeafDB';
const DB_VERSION = 1;
const STORES = {
  CONFIG: 'config',
  EXPENSES: 'expenses',
  EXPORTS: 'exports',
  IMPORTS: 'imports'
};

export class IndexedDBStorageService {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG);
        }
        if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
          const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
          expenseStore.createIndex('status', 'status', { unique: false });
          expenseStore.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.EXPORTS)) {
          db.createObjectStore(STORES.EXPORTS, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.IMPORTS)) {
          db.createObjectStore(STORES.IMPORTS, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Transaction failed: ${request.error}`));
    });
  }

  async loadConfig(): Promise<Config> {
    try {
      const config = await this.transaction<any>(
        STORES.CONFIG,
        'readonly',
        (store) => store.get('config')
      );

      if (!config) {
        return await this.initializeConfig();
      }

      return ConfigSchema.parse(config);
    } catch (error) {
      console.error('Failed to load config from IndexedDB:', error);
      throw error;
    }
  }

  async saveConfig(config: Config): Promise<void> {
    try {
      const updatedConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };

      const validatedConfig = ConfigSchema.parse(updatedConfig);
      await this.transaction(
        STORES.CONFIG,
        'readwrite',
        (store) => store.put(validatedConfig, 'config')
      );
    } catch (error) {
      console.error('Failed to save config to IndexedDB:', error);
      throw error;
    }
  }

  private async initializeConfig(): Promise<Config> {
    const defaultConfig: Config = {
      currency: 'USD',
      default_reminder_days: 3,
      default_unused_days: 45,
      app_data_directory: 'indexeddb',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  async loadAllExpenses(): Promise<Expense[]> {
    try {
      const expenses = await this.transaction<Expense[]>(
        STORES.EXPENSES,
        'readonly',
        (store) => store.getAll()
      );

      return expenses.map(expense => ExpenseSchema.parse(expense));
    } catch (error) {
      console.error('Failed to load expenses from IndexedDB:', error);
      return [];
    }
  }

  async loadExpense(id: string): Promise<Expense | null> {
    try {
      const expense = await this.transaction<Expense>(
        STORES.EXPENSES,
        'readonly',
        (store) => store.get(id)
      );

      if (!expense) {
        return null;
      }

      return ExpenseSchema.parse(expense);
    } catch (error) {
      console.error(`Failed to load expense ${id} from IndexedDB:`, error);
      return null;
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      const updatedExpense = {
        ...expense,
        metadata: {
          ...expense.metadata,
          updated_at: new Date().toISOString(),
        },
      };

      const validatedExpense = ExpenseSchema.parse(updatedExpense);
      await this.transaction(
        STORES.EXPENSES,
        'readwrite',
        (store) => store.put(validatedExpense)
      );
    } catch (error) {
      console.error(`Failed to save expense ${expense.id} to IndexedDB:`, error);
      throw error;
    }
  }

  async createExpense(expenseData: Omit<Expense, 'id' | 'metadata'>): Promise<Expense> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const expense: Expense = {
        ...expenseData,
        id,
        metadata: {
          created_at: now,
          updated_at: now,
        },
      };

      await this.saveExpense(expense);
      return expense;
    } catch (error) {
      console.error('Failed to create expense in IndexedDB:', error);
      throw error;
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      await this.transaction(
        STORES.EXPENSES,
        'readwrite',
        (store) => store.delete(id)
      );
    } catch (error) {
      console.error(`Failed to delete expense ${id} from IndexedDB:`, error);
      throw error;
    }
  }

  async validateExpense(expense: Expense): Promise<Expense> {
    try {
      return ExpenseSchema.parse(expense);
    } catch (error) {
      console.error('Expense validation failed:', error);
      throw error;
    }
  }

  async exportToCSV(expenses: Expense[]): Promise<string> {
    try {
      const headers = [
        'id',
        'name',
        'type',
        'status',
        'amount',
        'currency',
        'frequency',
        'interval',
        'due_day',
        'categories',
        'tags',
        'notes',
        'created_at',
        'updated_at',
      ];

      const rows = expenses.map(expense => [
        expense.id,
        expense.name,
        expense.type,
        expense.status,
        expense.cost.amount.toString(),
        expense.cost.currency,
        expense.billing.frequency,
        expense.billing.interval.toString(),
        expense.billing.due_day?.toString() || '',
        expense.category.join(';'),
        expense.tags.join(';'),
        expense.notes || '',
        expense.metadata.created_at,
        expense.metadata.updated_at,
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportData = {
        filename: `expenses-export-${timestamp}.csv`,
        content: csvContent,
        timestamp: new Date().toISOString()
      };

      await this.transaction(
        STORES.EXPORTS,
        'readwrite',
        (store) => store.add(exportData)
      );

      return csvContent;
    } catch (error) {
      console.error('Failed to export to CSV in IndexedDB:', error);
      throw error;
    }
  }

  async importExpenses(expenses: Expense[]): Promise<{ imported: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let imported = 0;

      for (const expenseData of expenses) {
        try {
          const validatedExpense = ExpenseSchema.parse(expenseData);
          await this.saveExpense(validatedExpense);
          imported++;
        } catch (error) {
          errors.push(`Failed to import expense "${expenseData.name}": ${error}`);
        }
      }

      return { imported, errors };
    } catch (error) {
      console.error('Failed to import expenses to IndexedDB:', error);
      throw error;
    }
  }

  async getAppDataDirectory(): Promise<string> {
    return 'indexeddb';
  }

  async setAppDataDirectory(_directory: string): Promise<void> {
    // For IndexedDB, this is just a reference
    console.log('App data directory set to:', _directory);
  }

  async getExports(): Promise<any[]> {
    try {
      const exports = await this.transaction<any[]>(
        STORES.EXPORTS,
        'readonly',
        (store) => store.getAll()
      );

      return exports;
    } catch (error) {
      console.error('Failed to get exports from IndexedDB:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await this.transaction(
        STORES.EXPENSES,
        'readwrite',
        (store) => store.clear()
      );

      await this.initializeConfig();
    } catch (error) {
      console.error('Failed to clear all data from IndexedDB:', error);
      throw error;
    }
  }
}

// Singleton instance
export const indexedDBStorageService = new IndexedDBStorageService();
