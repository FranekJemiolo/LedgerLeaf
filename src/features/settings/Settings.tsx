import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw, Download, Upload, Trash2, Bell, DollarSign, Calendar, Shield } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { storageService } from '../../storage';
import { notificationService } from '../../lib/notifications';

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
  const { config, loadConfig, updateConfig, expenses, clearAllExpenses } = useAppStore();
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

  useEffect(() => {
    if (config) {
      setSettings(prev => ({
        ...prev,
        currency: config.currency,
        defaultReminderDays: config.default_reminder_days,
        defaultUnusedDays: config.default_unused_days,
      }));
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateConfig({
        currency: settings.currency,
        default_reminder_days: settings.defaultReminderDays,
        default_unused_days: settings.defaultUnusedDays,
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

  const handleExportData = async () => {
    try {
      const csvContent = await storageService.exportToCSV(expenses);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledgerleaf-backup-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setSaveMessage({ type: 'error', message: 'Failed to export data' });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          // Simple CSV parsing for backup restoration
          const lines = content.split('\n');
          const headers = lines[0].split(',');
          
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your application preferences and data</p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`rounded-lg p-4 ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {saveMessage.message}
          </p>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <DollarSign className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold">General Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.name} ({currency.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Payment Reminder Days
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.defaultReminderDays}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultReminderDays: parseInt(e.target.value) || 3 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Days before payment due date to send reminders
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Unused Service Days
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.defaultUnusedDays}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultUnusedDays: parseInt(e.target.value) || 45 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Days of inactivity before sending usage reminders
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Bell className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Enable Notifications</p>
              <p className="text-sm text-gray-500">Allow LedgerLeaf to send browser notifications</p>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
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
                <p className="font-medium text-gray-900">Payment Reminders</p>
                <p className="text-sm text-gray-500">Get notified before payments are due</p>
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
                <p className="font-medium text-gray-900">Usage Reminders</p>
                <p className="text-sm text-gray-500">Get reminded about potentially unused services</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold">Data Management</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Export Data</p>
              <p className="text-sm text-gray-500">Download all your expenses as a CSV file</p>
            </div>
            <button
              onClick={handleExportData}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Import Data</p>
              <p className="text-sm text-gray-500">Restore expenses from a backup file</p>
            </div>
            <label className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer">
              <Upload className="h-4 w-4 mr-1" />
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
              <p className="font-medium text-gray-900">Clear All Data</p>
              <p className="text-sm text-gray-500">Delete all expenses and settings</p>
            </div>
            <button
              onClick={handleClearAllData}
              className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <SettingsIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold">About</h2>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
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
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
