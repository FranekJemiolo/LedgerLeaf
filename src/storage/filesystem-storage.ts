import { dump, load } from 'js-yaml';
import { Expense, ExpenseSchema, Config, ConfigSchema } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { fileSystemAccessService, FileSystemAccessError } from '../lib/filesystem';

export class FilesystemStorageService {
  private readonly EXPENSES_DIR = 'expenses';
  private readonly EXPORTS_DIR = 'exports';
  private readonly CONFIG_FILE = 'config.yml';

  async initialize(): Promise<void> {
    try {
      // Check if we have filesystem access
      const hasAccess = await fileSystemAccessService.verifyDirectoryAccess();
      
      if (!hasAccess) {
        // Try to request access
        const granted = await fileSystemAccessService.requestDirectoryAccess();
        if (!granted) {
          throw new Error('File system access is required for LedgerLeaf to function properly.');
        }
      }

      // Create necessary directories
      await this.ensureDirectoryExists(this.EXPENSES_DIR);
      await this.ensureDirectoryExists(this.EXPORTS_DIR);
      
      // Initialize config if it doesn't exist
      await this.initializeConfig();
    } catch (error) {
      console.error('Failed to initialize filesystem storage:', error);
      throw error;
    }
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await fileSystemAccessService.createDirectory(path);
    } catch (error) {
      // Directory might already exist, which is fine
      if (!(error instanceof FileSystemAccessError && error.code === 'ACCESS_DENIED')) {
        throw error;
      }
    }
  }

  private async initializeConfig(): Promise<Config> {
    try {
      const configExists = await fileSystemAccessService.fileExists(this.CONFIG_FILE);
      
      if (!configExists) {
        const defaultConfig: Config = {
          currency: 'USD',
          default_reminder_days: 3,
          default_unused_days: 45,
          app_data_directory: await fileSystemAccessService.getDirectoryPath() || 'filesystem',
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
      const configData = await fileSystemAccessService.readFile(this.CONFIG_FILE);
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
      
      await fileSystemAccessService.writeFile(this.CONFIG_FILE, yamlContent);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  async loadAllExpenses(): Promise<Expense[]> {
    try {
      const expenseFiles = await fileSystemAccessService.listFiles(this.EXPENSES_DIR);
      const expenses: Expense[] = [];

      for (const filename of expenseFiles) {
        if (filename.endsWith('.yml') || filename.endsWith('.yaml')) {
          try {
            const fileContent = await fileSystemAccessService.readFile(`${this.EXPENSES_DIR}/${filename}`);
            const parsedExpense = load(fileContent) as any;
            const validatedExpense = ExpenseSchema.parse(parsedExpense);
            expenses.push(validatedExpense);
          } catch (error) {
            console.error(`Failed to load expense from ${filename}:`, error);
            // Continue loading other expenses even if one fails
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
      const filename = this.getExpenseFilename(id);
      const fileContent = await fileSystemAccessService.readFile(`${this.EXPENSES_DIR}/${filename}`);
      const parsedExpense = load(fileContent) as any;
      const validatedExpense = ExpenseSchema.parse(parsedExpense);
      return validatedExpense;
    } catch (error) {
      console.error(`Failed to load expense ${id}:`, error);
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
      const yamlContent = dump(validatedExpense);
      const filename = this.getExpenseFilename(expense.id);
      
      await fileSystemAccessService.writeFile(`${this.EXPENSES_DIR}/${filename}`, yamlContent);
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
      const filename = this.getExpenseFilename(id);
      await fileSystemAccessService.deleteFile(`${this.EXPENSES_DIR}/${filename}`);
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
      const filename = `expenses-export-${timestamp}.csv`;
      const filepath = `${this.EXPORTS_DIR}/${filename}`;
      
      await fileSystemAccessService.writeFile(filepath, csvContent);
      
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
    return fileSystemAccessService.getDirectoryPath() || 'filesystem';
  }

  async setAppDataDirectory(_directory: string): Promise<void> {
    // This is handled by File System Access API directory picker
    // This method is kept for compatibility with existing interface
    console.log('App data directory set through File System Access API');
  }

  async getExports(): Promise<any[]> {
    try {
      const exportFiles = await fileSystemAccessService.listFiles(this.EXPORTS_DIR);
      const exports: any[] = [];

      for (const filename of exportFiles) {
        try {
          const filepath = `${this.EXPORTS_DIR}/${filename}`;
          const fileContent = await fileSystemAccessService.readFile(filepath);
          
          exports.push({
            filename,
            content: fileContent,
            timestamp: new Date().toISOString(),
            size: fileContent.length
          });
        } catch (error) {
          console.error(`Failed to load export ${filename}:`, error);
        }
      }

      return exports;
    } catch (error) {
      console.error('Failed to get exports:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const expenseFiles = await fileSystemAccessService.listFiles(this.EXPENSES_DIR);
      
      for (const filename of expenseFiles) {
        if (filename.endsWith('.yml') || filename.endsWith('.yaml')) {
          await fileSystemAccessService.deleteFile(`${this.EXPENSES_DIR}/${filename}`);
        }
      }

      // Reset config to defaults
      await this.initializeConfig();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  private getExpenseFilename(id: string): string {
    return `${id}.yml`;
  }
}

// Singleton instance
export const filesystemStorageService = new FilesystemStorageService();
