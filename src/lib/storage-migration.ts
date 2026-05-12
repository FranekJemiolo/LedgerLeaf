import { storageService } from '../storage';
import { filesystemStorageService } from '../storage/filesystem-storage';

export interface MigrationResult {
  success: boolean;
  expensesMigrated: number;
  errors: string[];
}

export class StorageMigrationService {
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      expensesMigrated: 0,
      errors: []
    };

    try {
      // Check if localStorage has data
      const hasLocalData = await this.hasLocalStorageData();
      if (!hasLocalData) {
        result.success = true;
        result.errors.push('No localStorage data found to migrate');
        return result;
      }

      // Initialize filesystem storage
      await filesystemStorageService.initialize();

      // Migrate config
      await this.migrateConfig();

      // Migrate expenses
      const migrationResult = await this.migrateExpenses();
      result.expensesMigrated = migrationResult.expensesMigrated;
      result.errors.push(...migrationResult.errors);

      // Verify migration
      const verificationResult = await this.verifyMigration();
      if (verificationResult.success) {
        result.success = true;
        result.errors.push(...verificationResult.errors);
      } else {
        result.errors.push(...verificationResult.errors);
      }

      return result;
    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  private async hasLocalStorageData(): Promise<boolean> {
    try {
      const config = localStorage.getItem('ledgerleaf_config');
      const expenses = localStorage.getItem('ledgerleaf_expenses');
      return !!(config || expenses);
    } catch (error) {
      console.error('Error checking localStorage data:', error);
      return false;
    }
  }

  private async migrateConfig(): Promise<void> {
    try {
      const localConfig = localStorage.getItem('ledgerleaf_config');
      if (localConfig) {
        const config = await storageService.loadConfig();
        await filesystemStorageService.saveConfig(config);
        console.log('Config migrated successfully');
      }
    } catch (error) {
      console.error('Failed to migrate config:', error);
      throw new Error(`Config migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async migrateExpenses(): Promise<{ expensesMigrated: number; errors: string[] }> {
    const result = { expensesMigrated: 0, errors: [] as string[] };

    try {
      const localExpenses = await storageService.loadAllExpenses();
      
      for (const expense of localExpenses) {
        try {
          await filesystemStorageService.saveExpense(expense);
          result.expensesMigrated++;
        } catch (error) {
          const errorMsg = `Failed to migrate expense "${expense.name}": ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Migrated ${result.expensesMigrated} expenses successfully`);
      return result;
    } catch (error) {
      console.error('Failed to migrate expenses:', error);
      result.errors.push(`Expense migration failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  private async verifyMigration(): Promise<{ success: boolean; errors: string[] }> {
    const result = { success: true, errors: [] as string[] };

    try {
      // Verify config exists
      const config = await filesystemStorageService.loadConfig();
      if (!config) {
        result.success = false;
        result.errors.push('Config not found after migration');
      }

      // Verify expenses count matches
      const localExpenses = await storageService.loadAllExpenses();
      const filesystemExpenses = await filesystemStorageService.loadAllExpenses();
      
      if (localExpenses.length !== filesystemExpenses.length) {
        result.success = false;
        result.errors.push(`Expense count mismatch: ${localExpenses.length} in localStorage, ${filesystemExpenses.length} in filesystem`);
      }

      // Verify all expenses have valid structure
      for (const expense of filesystemExpenses) {
        if (!expense.id || !expense.name || !expense.cost) {
          result.success = false;
          result.errors.push(`Invalid expense structure after migration: ${expense.name || 'Unknown'}`);
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  async clearLocalStorage(): Promise<void> {
    try {
      localStorage.removeItem('ledgerleaf_config');
      localStorage.removeItem('ledgerleaf_expenses');
      localStorage.removeItem('ledgerleaf_exports');
      localStorage.removeItem('ledgerleaf_imports');
      localStorage.removeItem('ledgerleaf_notifications');
      localStorage.removeItem('ledgerleaf_usage_confirmations');
      console.log('LocalStorage cleared successfully');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      throw new Error(`Failed to clear localStorage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMigrationStatus(): Promise<{
    hasLocalStorage: boolean;
    hasFilesystemAccess: boolean;
    needsMigration: boolean;
  }> {
    const hasLocalStorage = await this.hasLocalStorageData();
    const hasFilesystemAccess = await filesystemStorageService.initialize().then(() => true).catch(() => false);
    const needsMigration = hasLocalStorage && hasFilesystemAccess;

    return {
      hasLocalStorage,
      hasFilesystemAccess,
      needsMigration
    };
  }
}

// Singleton instance
export const storageMigrationService = new StorageMigrationService();
