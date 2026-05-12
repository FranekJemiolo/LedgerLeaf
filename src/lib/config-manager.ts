import { Config } from '../types';
import { storageService } from '../storage';

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigBackup {
  id: string;
  name: string;
  config: Config;
  createdAt: string;
  description?: string;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<Config>;
  category: 'personal' | 'business' | 'family' | 'custom';
}

export class ConfigManager {
  private readonly STORAGE_KEY = 'ledgerleaf-config-backups';
  private readonly TEMPLATES: ConfigTemplate[] = [
    {
      id: 'personal-basic',
      name: 'Personal Basic',
      description: 'Basic configuration for personal expense tracking',
      category: 'personal',
      config: {
        currency: 'USD',
        default_reminder_days: 3,
        default_unused_days: 45,
        app_data_directory: 'localStorage'
      }
    },
    {
      id: 'personal-advanced',
      name: 'Personal Advanced',
      description: 'Advanced configuration with comprehensive tracking',
      category: 'personal',
      config: {
        currency: 'USD',
        default_reminder_days: 7,
        default_unused_days: 30,
        app_data_directory: 'localStorage'
      }
    },
    {
      id: 'business-small',
      name: 'Small Business',
      description: 'Configuration for small business expense management',
      category: 'business',
      config: {
        currency: 'USD',
        default_reminder_days: 5,
        default_unused_days: 60,
        app_data_directory: 'localStorage'
      }
    },
    {
      id: 'family-shared',
      name: 'Family Shared',
      description: 'Configuration for family expense tracking',
      category: 'family',
      config: {
        currency: 'USD',
        default_reminder_days: 3,
        default_unused_days: 90,
        app_data_directory: 'localStorage'
      }
    }
  ];

  async validateConfig(config: Partial<Config>): Promise<ConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate currency
    if (config.currency && !/^[A-Z]{3}$/.test(config.currency)) {
      errors.push('Currency must be a valid 3-letter ISO code (e.g., USD, EUR)');
    }

    // Validate reminder days
    if (config.default_reminder_days !== undefined) {
      if (!Number.isInteger(config.default_reminder_days) || config.default_reminder_days < 1 || config.default_reminder_days > 30) {
        errors.push('Default reminder days must be an integer between 1 and 30');
      } else if (config.default_reminder_days > 14) {
        warnings.push('Reminder days greater than 14 may be too late for effective notifications');
      }
    }

    // Validate unused days
    if (config.default_unused_days !== undefined) {
      if (!Number.isInteger(config.default_unused_days) || config.default_unused_days < 1 || config.default_unused_days > 365) {
        errors.push('Default unused days must be an integer between 1 and 365');
      } else if (config.default_unused_days < 30) {
        warnings.push('Unused days less than 30 may result in frequent notifications');
      }
    }

    // Validate app data directory
    if (config.app_data_directory && typeof config.app_data_directory !== 'string') {
      errors.push('App data directory must be a string');
    }

    // Validate dates
    if (config.created_at && !this.isValidDateString(config.created_at)) {
      errors.push('Created at must be a valid ISO date string');
    }

    if (config.updated_at && !this.isValidDateString(config.updated_at)) {
      errors.push('Updated at must be a valid ISO date string');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString();
  }

  async createBackup(config: Config, name: string, description?: string): Promise<ConfigBackup> {
    const backup: ConfigBackup = {
      id: this.generateId(),
      name,
      config: { ...config },
      createdAt: new Date().toISOString(),
      description
    };

    const backups = await this.getBackups();
    backups.push(backup);
    await this.saveBackups(backups);

    return backup;
  }

  async getBackups(): Promise<ConfigBackup[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load config backups:', error);
      return [];
    }
  }

  async restoreBackup(backupId: string): Promise<Config | null> {
    const backups = await this.getBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }

    // Validate the backup config before restoring
    const validation = await this.validateConfig(backup.config);
    if (!validation.isValid) {
      throw new Error(`Invalid backup configuration: ${validation.errors.join(', ')}`);
    }

    // Update the config with restored values, preserving current timestamps
    const restoredConfig: Config = {
      ...backup.config,
      updated_at: new Date().toISOString()
    };

    await storageService.saveConfig(restoredConfig);
    return restoredConfig;
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.getBackups();
    const filteredBackups = backups.filter(b => b.id !== backupId);
    await this.saveBackups(filteredBackups);
  }

  private async saveBackups(backups: ConfigBackup[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to save config backups:', error);
      throw new Error('Failed to save backups');
    }
  }

  async applyTemplate(templateId: string): Promise<Config> {
    const template = this.TEMPLATES.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    const currentConfig = await storageService.loadConfig();
    const newConfig: Config = {
      currency: template.config.currency || currentConfig.currency,
      default_reminder_days: template.config.default_reminder_days || currentConfig.default_reminder_days,
      default_unused_days: template.config.default_unused_days || currentConfig.default_unused_days,
      app_data_directory: currentConfig.app_data_directory,
      created_at: currentConfig.created_at,
      updated_at: new Date().toISOString()
    };

    const validation = await this.validateConfig(newConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
    }

    await storageService.saveConfig(newConfig);
    return newConfig;
  }

  getTemplates(): ConfigTemplate[] {
    return this.TEMPLATES;
  }

  async exportConfig(config: Config): Promise<string> {
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      config
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importConfig(configJson: string): Promise<Config> {
    try {
      const importData = JSON.parse(configJson);
      
      if (!importData.config) {
        throw new Error('Invalid configuration file format');
      }

      const validation = await this.validateConfig(importData.config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      const newConfig: Config = {
        ...importData.config,
        updated_at: new Date().toISOString()
      };

      await storageService.saveConfig(newConfig);
      return newConfig;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  async resetToDefaults(): Promise<Config> {
    const defaultConfig: Config = {
      currency: 'USD',
      default_reminder_days: 3,
      default_unused_days: 45,
      app_data_directory: 'localStorage',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await storageService.saveConfig(defaultConfig);
    return defaultConfig;
  }

  async getConfigStats(): Promise<{
    totalBackups: number;
    oldestBackup?: string;
    newestBackup?: string;
    configAge: number;
    lastUpdated: string;
  }> {
    const backups = await this.getBackups();
    const config = await storageService.loadConfig();
    
    let oldestBackup: string | undefined;
    let newestBackup: string | undefined;
    
    if (backups.length > 0) {
      const sortedBackups = backups.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      oldestBackup = sortedBackups[0].createdAt;
      newestBackup = sortedBackups[sortedBackups.length - 1].createdAt;
    }

    const configAge = config ? 
      Math.floor((Date.now() - new Date(config.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      totalBackups: backups.length,
      oldestBackup,
      newestBackup,
      configAge,
      lastUpdated: config?.updated_at || new Date().toISOString()
    };
  }

  async cleanupOldBackups(maxBackups: number = 10): Promise<number> {
    const backups = await this.getBackups();
    
    if (backups.length <= maxBackups) {
      return 0;
    }

    // Sort by creation date (oldest first) and keep only the newest maxBackups
    const sortedBackups = backups.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const backupsToDelete = sortedBackups.slice(0, backups.length - maxBackups);
    const remainingBackups = sortedBackups.slice(backups.length - maxBackups);
    
    await this.saveBackups(remainingBackups);
    
    return backupsToDelete.length;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async mergeConfigs(baseConfig: Config, overrideConfig: Partial<Config>): Promise<Config> {
    const mergedConfig: Config = {
      ...baseConfig,
      ...overrideConfig,
      updated_at: new Date().toISOString()
    };

    // Preserve created_at from base config
    if (baseConfig.created_at) {
      mergedConfig.created_at = baseConfig.created_at;
    }

    const validation = await this.validateConfig(mergedConfig);
    if (!validation.isValid) {
      throw new Error(`Merged configuration is invalid: ${validation.errors.join(', ')}`);
    }

    await storageService.saveConfig(mergedConfig);
    return mergedConfig;
  }

  async compareConfigs(config1: Config, config2: Config): Promise<{
    differences: { field: string; oldValue: any; newValue: any }[];
    similarity: number;
  }> {
    const differences: { field: string; oldValue: any; newValue: any }[] = [];
    let totalFields = 0;
    let matchingFields = 0;

    const compareField = (field: string, value1: any, value2: any) => {
      totalFields++;
      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({ field, oldValue: value1, newValue: value2 });
      } else {
        matchingFields++;
      }
    };

    // Compare all relevant fields
    compareField('currency', config1.currency, config2.currency);
    compareField('default_reminder_days', config1.default_reminder_days, config2.default_reminder_days);
    compareField('default_unused_days', config1.default_unused_days, config2.default_unused_days);
    compareField('app_data_directory', config1.app_data_directory, config2.app_data_directory);

    const similarity = totalFields > 0 ? (matchingFields / totalFields) * 100 : 0;

    return {
      differences,
      similarity: Math.round(similarity)
    };
  }
}

// Singleton instance
export const configManager = new ConfigManager();
