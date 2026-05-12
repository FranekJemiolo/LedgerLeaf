import { readTextFile, writeTextFile, exists, mkdir, readDir, remove } from '@tauri-apps/plugin-fs';
import { join, documentDir } from '@tauri-apps/api/path';
import { dump, load } from 'js-yaml';
import { Expense, ExpenseSchema, Config, ConfigSchema } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private appDataDir: string = '';
  private expensesDir: string = '';
  private exportsDir: string = '';
  private importsDir: string = '';

  async initialize(): Promise<void> {
    try {
      // Get app data directory
      const docDir = await documentDir();
      this.appDataDir = await join(docDir, 'LedgerLeaf');
      
      // Create directories if they don't exist
      this.expensesDir = await join(this.appDataDir, 'expenses');
      this.exportsDir = await join(this.appDataDir, 'exports');
      this.importsDir = await join(this.appDataDir, 'imports');

      await mkdir(this.expensesDir, { recursive: true });
      await mkdir(this.exportsDir, { recursive: true });
      await mkdir(this.importsDir, { recursive: true });

      // Initialize config if it doesn't exist
      await this.initializeConfig();
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  private async initializeConfig(): Promise<Config> {
    const configPath = await join(this.appDataDir, 'config.yml');
    
    try {
      const configExists = await exists(configPath);
      
      if (!configExists) {
        const defaultConfig: Config = {
          currency: 'USD',
          default_reminder_days: 3,
          default_unused_days: 45,
          app_data_directory: this.appDataDir,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }
      
      return await this.loadConfig();
    } catch (error) {
      console.error('Failed to initialize config:', error);
      throw error;
    }
  }

  async loadConfig(): Promise<Config> {
    try {
      const configPath = await join(this.appDataDir, 'config.yml');
      const configContent = await readTextFile(configPath);
      const configData = load(configContent) as any;
      
      const validatedConfig = ConfigSchema.parse(configData);
      return validatedConfig;
    } catch (error) {
      console.error('Failed to load config:', error);
      throw error;
    }
  }

  async saveConfig(config: Config): Promise<void> {
    try {
      const configPath = await join(this.appDataDir, 'config.yml');
      const updatedConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };
      
      const validatedConfig = ConfigSchema.parse(updatedConfig);
      const yamlContent = dump(validatedConfig);
      
      await writeTextFile(configPath, yamlContent);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  async loadAllExpenses(): Promise<Expense[]> {
    try {
      const expenses: Expense[] = [];
      const entries = await readDir(this.expensesDir);
      
      for (const entry of entries) {
        if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
          const expense = await this.loadExpense(entry.name.replace(/\.(yml|yaml)$/, ''));
          if (expense) {
            expenses.push(expense);
          }
        }
      }
      
      return expenses;
    } catch (error) {
      console.error('Failed to load expenses:', error);
      throw error;
    }
  }

  async loadExpense(id: string): Promise<Expense | null> {
    try {
      const fileName = `${this.sanitizeFileName(id)}.yml`;
      const expensePath = await join(this.expensesDir, fileName);
      
      const fileExists = await exists(expensePath);
      if (!fileExists) {
        return null;
      }
      
      const content = await readTextFile(expensePath);
      const data = load(content) as any;
      
      const validatedExpense = ExpenseSchema.parse(data);
      return validatedExpense;
    } catch (error) {
      console.error(`Failed to load expense ${id}:`, error);
      return null;
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      const fileName = `${this.sanitizeFileName(expense.id)}.yml`;
      const expensePath = await join(this.expensesDir, fileName);
      
      const updatedExpense = {
        ...expense,
        metadata: {
          ...expense.metadata,
          updated_at: new Date().toISOString(),
        },
      };
      
      const validatedExpense = ExpenseSchema.parse(updatedExpense);
      const yamlContent = dump(validatedExpense);
      
      await writeTextFile(expensePath, yamlContent);
    } catch (error) {
      console.error(`Failed to save expense ${expense.id}:`, error);
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
      console.error('Failed to create expense:', error);
      throw error;
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const fileName = `${this.sanitizeFileName(id)}.yml`;
      const expensePath = await join(this.expensesDir, fileName);
      
      const fileExists = await exists(expensePath);
      if (fileExists) {
        await remove(expensePath);
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
      const exportPath = await join(this.exportsDir, `expenses-export-${timestamp}.csv`);
      
      await writeTextFile(exportPath, csvContent);
      return exportPath;
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

  private sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async getAppDataDirectory(): Promise<string> {
    return this.appDataDir;
  }

  async setAppDataDirectory(directory: string): Promise<void> {
    try {
      const config = await this.loadConfig();
      config.app_data_directory = directory;
      config.updated_at = new Date().toISOString();
      
      // Update internal paths
      this.appDataDir = directory;
      this.expensesDir = await join(directory, 'expenses');
      this.exportsDir = await join(directory, 'exports');
      this.importsDir = await join(directory, 'imports');
      
      // Create new directories
      await mkdir(this.expensesDir, { recursive: true });
      await mkdir(this.exportsDir, { recursive: true });
      await mkdir(this.importsDir, { recursive: true });
      
      await this.saveConfig(config);
    } catch (error) {
      console.error('Failed to set app data directory:', error);
      throw error;
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
