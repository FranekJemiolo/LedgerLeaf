import { dump, load } from 'js-yaml';
import { Expense, ExpenseSchema, Config, ConfigSchema } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { fileSystemAccessService } from '../lib/filesystem';
import { filesystemStorageService } from './filesystem-storage';

export class StorageService {
  private readonly STORAGE_KEYS = {
    CONFIG: 'ledgerleaf_config',
    EXPENSES: 'ledgerleaf_expenses',
    EXPORTS: 'ledgerleaf_exports',
    IMPORTS: 'ledgerleaf_imports'
  };

  async initialize(): Promise<void> {
    try {
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        // Use filesystem storage
        await filesystemStorageService.initialize();
        console.log('Using filesystem storage');
      } else {
        // Fall back to localStorage
        await this.initializeConfig();
        console.log('Using localStorage storage');
      }
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  private async initializeConfig(): Promise<Config> {
    try {
      const configData = localStorage.getItem(this.STORAGE_KEYS.CONFIG);
      
      if (!configData) {
        const defaultConfig: Config = {
          currency: 'USD',
          default_reminder_days: 3,
          default_unused_days: 45,
          app_data_directory: 'localStorage',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }
      
      const parsedConfig = load(configData) as any;
      const validatedConfig = ConfigSchema.parse(parsedConfig);
      return validatedConfig;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      throw error;
    }
  }

  async loadConfig(): Promise<Config> {
    try {
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        return await filesystemStorageService.loadConfig();
      }

      // Fall back to localStorage
      const configData = localStorage.getItem(this.STORAGE_KEYS.CONFIG);
      if (!configData) {
        throw new Error('Config not found');
      }
      
      const parsedConfig = load(configData) as any;
      const validatedConfig = ConfigSchema.parse(parsedConfig);
      return validatedConfig;
    } catch (error) {
      console.error('Failed to load config:', error);
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
      const yamlContent = dump(validatedConfig);
      
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        await filesystemStorageService.saveConfig(validatedConfig);
      } else {
        localStorage.setItem(this.STORAGE_KEYS.CONFIG, yamlContent);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  async loadAllExpenses(): Promise<Expense[]> {
    try {
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        return await filesystemStorageService.loadAllExpenses();
      }

      // Fall back to localStorage
      const expensesData = localStorage.getItem(this.STORAGE_KEYS.EXPENSES);
      if (!expensesData) {
        return [];
      }
      
      const parsedData = load(expensesData) as any;
      const expenses = Array.isArray(parsedData) ? parsedData : [];
      
      return expenses.map((expense: any) => ExpenseSchema.parse(expense));
    } catch (error) {
      console.error('Failed to load expenses:', error);
      return [];
    }
  }

  async loadExpense(id: string): Promise<Expense | null> {
    try {
      const expenses = await this.loadAllExpenses();
      return expenses.find(expense => expense.id === id) || null;
    } catch (error) {
      console.error(`Failed to load expense ${id}:`, error);
      return null;
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        await filesystemStorageService.saveExpense(expense);
      } else {
        const expenses = await this.loadAllExpenses();
        const updatedExpense = {
          ...expense,
          metadata: {
            ...expense.metadata,
            updated_at: new Date().toISOString(),
          },
        };
        
        const validatedExpense = ExpenseSchema.parse(updatedExpense);
        
        const existingIndex = expenses.findIndex(e => e.id === expense.id);
        if (existingIndex >= 0) {
          expenses[existingIndex] = validatedExpense;
        } else {
          expenses.push(validatedExpense);
        }
        
        const yamlContent = dump(expenses);
        localStorage.setItem(this.STORAGE_KEYS.EXPENSES, yamlContent);
      }
    } catch (error) {
      console.error(`Failed to save expense ${expense.id}:`, error);
      throw error;
    }
  }

  async createExpense(expenseData: Omit<Expense, 'id' | 'metadata'>): Promise<Expense> {
    try {
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        return await filesystemStorageService.createExpense(expenseData);
      }

      // Fall back to localStorage
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
      console.error('Failed to create expense:', error);
      throw error;
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        await filesystemStorageService.deleteExpense(id);
      } else {
        const expenses = await this.loadAllExpenses();
        const filteredExpenses = expenses.filter(e => e.id !== id);
        
        const yamlContent = dump(filteredExpenses);
        localStorage.setItem(this.STORAGE_KEYS.EXPENSES, yamlContent);
      }
    } catch (error) {
      console.error(`Failed to delete expense ${id}:`, error);
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
      
      const existingExports = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.EXPORTS) || '[]');
      existingExports.push(exportData);
      localStorage.setItem(this.STORAGE_KEYS.EXPORTS, JSON.stringify(existingExports));
      
      return csvContent;
    } catch (error) {
      console.error('Failed to export to CSV:', error);
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
      console.error('Failed to import expenses:', error);
      throw error;
    }
  }

  async getAppDataDirectory(): Promise<string> {
    // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        return await filesystemStorageService.getAppDataDirectory();
      }

      return this.STORAGE_KEYS.CONFIG;
  }

  async setAppDataDirectory(directory: string): Promise<void> {
    // Check if File System Access API is available and has permission
      const hasFilesystemAccess = fileSystemAccessService.supported && 
                                   await fileSystemAccessService.verifyDirectoryAccess();

      if (hasFilesystemAccess) {
        await filesystemStorageService.setAppDataDirectory(directory);
      } else {
        // For localStorage, this is just a reference
        console.log('App data directory set to:', directory);
      }
  }

  async getExports(): Promise<any[]> {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.EXPORTS) || '[]');
    } catch (error) {
      console.error('Failed to get exports:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.CONFIG);
      localStorage.removeItem(this.STORAGE_KEYS.EXPENSES);
      localStorage.removeItem(this.STORAGE_KEYS.EXPORTS);
      localStorage.removeItem(this.STORAGE_KEYS.IMPORTS);
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
