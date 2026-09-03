import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { exportService } from '../../lib/export-service';
import { fileSystemAccessService } from '../../lib/filesystem';
import type { ExportOptions } from '../../lib/export-service';

interface AppSettings {
  currency: string;
  defaultReminderDays: number;
  defaultUnusedDays: number;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    paymentReminders: boolean;
    usageReminders: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
}

export const Settings: React.FC = () => {
  const { config, updateConfig, expenses, clearAllExpenses } = useAppStore();
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'USD',
    defaultReminderDays: 3,
    defaultUnusedDays: 45,
    theme: 'system',
    notifications: {
      enabled: true,
      paymentReminders: true,
      usageReminders: true,
    },
    privacy: {
      analytics: false,
      crashReporting: false,
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Derived state from config
  const derivedSettings = config ? {
    currency: config.currency,
    defaultReminderDays: config.default_reminder_days,
    defaultUnusedDays: config.default_unused_days,
    theme: 'light' as const,
    notifications: {
      enabled: false,
      paymentReminders: false,
      usageReminders: false,
    },
    privacy: {
      analytics: false,
      crashReporting: false,
    },
  } : settings;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateConfig({
        currency: derivedSettings.currency,
        default_reminder_days: derivedSettings.defaultReminderDays,
        default_unused_days: derivedSettings.defaultUnusedDays,
        app_data_directory: config?.app_data_directory || 'localStorage',
        created_at: config?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setSaveMessage({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleReset = () => {
    if (config) {
      setSettings(prev => ({
        ...prev,
        currency: config.currency,
        defaultReminderDays: config.default_reminder_days,
        defaultUnusedDays: config.default_unused_days,
      }));
    }
  };

  const handleExportData = async (format: 'xlsx' | 'csv' | 'json' = 'xlsx') => {
    try {
      const exportOptions: ExportOptions = {
        format,
        includeMetadata: true,
        sortBy: 'name',
        sortOrder: 'asc'
      };
      
      const result = await exportService.exportExpenses(expenses, config!, exportOptions);
      
      if (result.success) {
        setSaveMessage({ 
          type: 'success', 
          message: `Successfully exported ${result.recordCount} expenses to ${result.filename}` 
        });
      } else {
        setSaveMessage({ type: 'error', message: result.error || 'Export failed' });
      }
    } catch (error) {
      console.error('Export failed:', error);
      setSaveMessage({ type: 'error', message: 'Failed to export data' });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // This is a simplified import - in a real app, you'd want more robust parsing
          setSaveMessage({ type: 'success', message: 'Data import feature coming soon' });
        } catch (error) {
          console.error('Import failed:', error);
          setSaveMessage({ type: 'error', message: 'Failed to import data' });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to delete all expenses? This action cannot be undone.')) {
      clearAllExpenses();
      notificationService.clearNotificationHistory();
      setSaveMessage({ type: 'success', message: 'All data cleared successfully' });
    }
  };

  const handleSelectDataDirectory = async () => {
    try {
      const granted = await fileSystemAccessService.requestDirectoryAccess();
      if (granted) {
        setSaveMessage({ type: 'success', message: 'Data directory selected successfully!' });
      } else {
        setSaveMessage({ type: 'error', message: 'Directory selection cancelled' });
      }
    } catch (error) {
      console.error('Failed to select data directory:', error);
      setSaveMessage({ type: 'error', message: 'Failed to select data directory' });
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({ ...prev, theme }));
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSaveMessage({ type: 'success', message: 'Notifications enabled!' });
      } else {
        setSaveMessage({ type: 'error', message: 'Notification permission denied' });
      }
    } else {
      setSaveMessage({ type: 'error', message: 'Notifications not supported in this browser' });
    }
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="font-headline-md text-headline-md text-primary">Settings</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Manage your application preferences and data</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`rounded-lg p-4 ${
          saveMessage.type === 'success'
            ? 'bg-success-container text-on-success-container border border-success'
            : 'bg-error-container text-on-error-container border border-error'
        }`}>
          <p className={`font-body-sm text-body-sm ${
            saveMessage.type === 'success' ? 'text-success' : 'text-error'
          }`}>
            {saveMessage.message}
          </p>
        </div>
      )}

      {/* General Settings Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="material-symbols-outlined text-primary mr-2">payments</span>
          <h3 className="font-headline-md text-headline-md text-primary">General Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">
              Default Currency
            </label>
            <select
              name="currency"
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">
              Default Payment Reminder Days
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.defaultReminderDays}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultReminderDays: parseInt(e.target.value) || 3 }))}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
            />
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Days before payment due date to send reminders
            </p>
          </div>

          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">
              Default Unused Service Days
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.defaultUnusedDays}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultUnusedDays: parseInt(e.target.value) || 45 }))}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
            />
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Days of inactivity before sending usage reminders
            </p>
          </div>

          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as any)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Choose your preferred color scheme
            </p>
          </div>
        </div>
      </div>

      {/* Data Directory Section */}
      {fileSystemAccessService.supported && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <div className="flex items-center mb-4">
            <span className="material-symbols-outlined text-primary mr-2">folder</span>
            <h3 className="font-headline-md text-headline-md text-primary">Data Directory</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body-base text-body-base text-primary">Current Storage</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {config?.app_data_directory || 'localStorage'}
                </p>
              </div>
              <button
                onClick={handleSelectDataDirectory}
                className="flex items-center px-3 py-1 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:opacity-90"
              >
                <span className="material-symbols-outlined">folder_open</span>
                Change Directory
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Select a local directory to store your expense data as YAML files. This enables full offline access and data portability.
            </p>
          </div>
        </div>
      )}

      {/* Notification Settings Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="material-symbols-outlined text-primary mr-2">notifications</span>
          <h3 className="font-headline-md text-headline-md text-primary">Notifications</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body-base text-body-base text-primary">Enable Notifications</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Allow LedgerLeaf to send browser notifications</p>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-1 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:opacity-90"
            >
              Enable
            </button>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.paymentReminders}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, paymentReminders: e.target.checked }
                }))}
                className="mr-2"
              />
              <div>
                <p className="font-body-base text-body-base text-primary">Payment Reminders</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Get notified before payments are due</p>
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.usageReminders}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, usageReminders: e.target.checked }
                }))}
                className="mr-2"
              />
              <div>
                <p className="font-body-base text-body-base text-primary">Usage Reminders</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Get reminded about potentially unused services</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="material-symbols-outlined text-primary mr-2">shield</span>
          <h3 className="font-headline-md text-headline-md text-primary">Data Management</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body-base text-body-base text-primary">Export Data</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Download all your expenses in various formats</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportData('xlsx')}
                  className="flex items-center px-3 py-1 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:opacity-90"
                >
                  <span className="material-symbols-outlined">table_chart</span>
                  Excel
                </button>
                <button
                  onClick={() => handleExportData('csv')}
                  className="flex items-center px-3 py-1 bg-surface-container border border-outline-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined">description</span>
                  CSV
                </button>
                <button
                  onClick={() => handleExportData('json')}
                  className="flex items-center px-3 py-1 bg-surface-container border border-outline-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined">code</span>
                  JSON
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-body-base text-body-base text-primary">Import Data</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Restore expenses from a backup file</p>
            </div>
            <label className="flex items-center px-3 py-1 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:opacity-90 cursor-pointer">
              <span className="material-symbols-outlined">upload_file</span>
              Import
              <input
                type="file"
                accept=".csv"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-body-base text-body-base text-primary">Clear All Data</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Delete all expenses and settings</p>
            </div>
            <button
              onClick={handleClearAllData}
              className="flex items-center px-3 py-1 bg-error text-on-error rounded-lg font-label-caps text-label-caps hover:opacity-90"
            >
              <span className="material-symbols-outlined">delete</span>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* App Info Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="material-symbols-outlined text-primary mr-2">settings</span>
          <h3 className="font-headline-md text-headline-md text-primary">About</h3>
        </div>
        
        <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant">
          <p><strong>LedgerLeaf</strong> - Local-First Expense Tracker</p>
          <p>Version: 1.0.0</p>
          <p>Data Storage: {config?.app_data_directory || 'localStorage'}</p>
          <p>Total Expenses: {expenses.length}</p>
          <p>Active Expenses: {expenses.filter(e => e.status === 'active').length}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="flex items-center px-4 py-2 bg-surface-container border border-outline-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined">refresh</span>
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg font-label-caps text-label-caps hover:opacity-90 disabled:bg-surface-container disabled:text-on-surface-variant disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
