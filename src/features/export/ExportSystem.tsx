import React, { useState } from 'react';
import { Expense } from '../../types';
import { useAppStore } from '../../lib/store';
import { storageService } from '../../storage';
import * as XLSX from 'xlsx';

interface ExportOptions {
  format: 'csv' | 'xlsx';
  dateRange: 'all' | 'last30' | 'last90' | 'lastyear' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  includeInactive: boolean;
  fields: {
    id: boolean;
    name: boolean;
    type: boolean;
    status: boolean;
    amount: boolean;
    currency: boolean;
    frequency: boolean;
    interval: boolean;
    dueDay: boolean;
    categories: boolean;
    tags: boolean;
    notes: boolean;
    createdAt: boolean;
    updatedAt: boolean;
  };
}

export const ExportSystem: React.FC = () => {
  const { expenses } = useAppStore();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: 'all',
    includeInactive: false,
    fields: {
      id: true,
      name: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      frequency: true,
      interval: false,
      dueDay: false,
      categories: true,
      tags: true,
      notes: true,
      createdAt: true,
      updatedAt: false,
    },
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string; filename?: string } | null>(null);

  const filterExpensesByDateRange = (expenses: Expense[]): Expense[] => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (exportOptions.dateRange) {
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'lastyear':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (exportOptions.customStartDate) {
          startDate = new Date(exportOptions.customStartDate);
        } else {
          startDate = new Date(0); // Beginning of time
        }
        if (exportOptions.customEndDate) {
          endDate = new Date(exportOptions.customEndDate);
        }
        break;
      default:
        startDate = new Date(0); // Beginning of time
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.metadata.created_at);
      const matchesDateRange = expenseDate >= startDate && expenseDate <= endDate;
      const matchesStatus = exportOptions.includeInactive || expense.status === 'active';
      return matchesDateRange && matchesStatus;
    });
  };

  const prepareExportData = (expenses: Expense[]): any[] => {
    return expenses.map(expense => {
      const row: any = {};

      if (exportOptions.fields.id) row.id = expense.id;
      if (exportOptions.fields.name) row.name = expense.name;
      if (exportOptions.fields.type) row.type = expense.type;
      if (exportOptions.fields.status) row.status = expense.status;
      if (exportOptions.fields.amount) row.amount = expense.cost.amount;
      if (exportOptions.fields.currency) row.currency = expense.cost.currency;
      if (exportOptions.fields.frequency) row.frequency = expense.billing.frequency;
      if (exportOptions.fields.interval) row.interval = expense.billing.interval;
      if (exportOptions.fields.dueDay) row.due_day = expense.billing.due_day || '';
      if (exportOptions.fields.categories) row.categories = expense.category.join(';');
      if (exportOptions.fields.tags) row.tags = expense.tags.join(';');
      if (exportOptions.fields.notes) row.notes = expense.notes || '';
      if (exportOptions.fields.createdAt) row.created_at = expense.metadata.created_at;
      if (exportOptions.fields.updatedAt) row.updated_at = expense.metadata.updated_at;

      return row;
    });
  };

  const exportToCSV = (data: any[], filename: string): void => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv');
  };

  const exportToXLSX = (data: any[], filename: string): void => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(excelBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const downloadFile = (content: any, filename: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const filteredExpenses = filterExpensesByDateRange(expenses);
      const exportData = prepareExportData(filteredExpenses);

      if (exportData.length === 0) {
        setExportResult({
          success: false,
          message: 'No expenses found matching the selected criteria.'
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = exportOptions.format === 'csv' ? 'csv' : 'xlsx';
      const filename = `ledgerleaf-export-${timestamp}.${extension}`;

      if (exportOptions.format === 'csv') {
        exportToCSV(exportData, filename);
      } else {
        exportToXLSX(exportData, filename);
      }

      // Also save to storage service for history
      await storageService.exportToCSV(filteredExpenses);

      setExportResult({
        success: true,
        message: `Successfully exported ${filteredExpenses.length} expenses to ${filename}`,
        filename
      });
    } catch (error) {
      console.error('Export failed:', error);
      setExportResult({
        success: false,
        message: `Export failed: ${error}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleField = (field: keyof ExportOptions['fields']) => {
    setExportOptions(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: !prev.fields[field]
      }
    }));
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getExportPreview = () => {
    const filteredExpenses = filterExpensesByDateRange(expenses);
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.cost.amount, 0);
    
    return {
      count: filteredExpenses.length,
      totalAmount,
      dateRange: exportOptions.dateRange,
      includeInactive: exportOptions.includeInactive,
    };
  };

  const preview = getExportPreview();

  const allFields: { key: keyof ExportOptions['fields']; label: string; description: string }[] = [
    { key: 'id', label: 'ID', description: 'Unique expense identifier' },
    { key: 'name', label: 'Name', description: 'Expense name/description' },
    { key: 'type', label: 'Type', description: 'Expense type (subscription, service, etc.)' },
    { key: 'status', label: 'Status', description: 'Current status (active, inactive, etc.)' },
    { key: 'amount', label: 'Amount', description: 'Cost amount' },
    { key: 'currency', label: 'Currency', description: 'Currency code' },
    { key: 'frequency', label: 'Frequency', description: 'Billing frequency' },
    { key: 'interval', label: 'Interval', description: 'Billing interval number' },
    { key: 'dueDay', label: 'Due Day', description: 'Day of month for payment' },
    { key: 'categories', label: 'Categories', description: 'Expense categories' },
    { key: 'tags', label: 'Tags', description: 'Custom tags' },
    { key: 'notes', label: 'Notes', description: 'Additional notes' },
    { key: 'createdAt', label: 'Created Date', description: 'When expense was created' },
    { key: 'updatedAt', label: 'Updated Date', description: 'When expense was last updated' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="font-headline-md text-headline-md text-primary">Export</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Export your expense data to CSV or Excel files</p>
      </div>

      {/* Export Options */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h3 className="font-headline-md text-headline-md text-primary mb-6">Export Options</h3>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">Export Format</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={exportOptions.format === 'csv'}
                  onChange={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                  className="mr-2"
                />
                <span className="font-body-sm text-body-sm text-on-surface">CSV</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="xlsx"
                  checked={exportOptions.format === 'xlsx'}
                  onChange={() => setExportOptions(prev => ({ ...prev, format: 'xlsx' }))}
                  className="mr-2"
                />
                <span className="font-body-sm text-body-sm text-on-surface">Excel (.xlsx)</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">Date Range</label>
            <select
              value={exportOptions.dateRange}
              onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
            >
              <option value="all">All expenses</option>
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="lastyear">Last year</option>
              <option value="custom">Custom range</option>
            </select>
            
            {exportOptions.dateRange === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={exportOptions.customStartDate || ''}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, customStartDate: e.target.value }))}
                  className="px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={exportOptions.customEndDate || ''}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, customEndDate: e.target.value }))}
                  className="px-3 py-2 bg-surface-container border border-outline-variant rounded-lg focus:border-primary focus:outline-none"
                  placeholder="End date"
                />
              </div>
            )}
          </div>

          {/* Include Inactive */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.includeInactive}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeInactive: e.target.checked }))}
                className="mr-2"
              />
              <span className="font-body-sm text-body-sm text-on-surface">Include inactive expenses</span>
            </label>
          </div>

          {/* Field Selection */}
          <div>
            <label className="block font-body-sm text-body-sm text-on-surface-variant mb-2">Fields to Export</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allFields.map(field => (
                <label key={field.key} className="flex items-start">
                  <input
                    type="checkbox"
                    checked={exportOptions.fields[field.key]}
                    onChange={() => toggleField(field.key)}
                    className="mr-2 mt-0.5"
                  />
                  <div>
                    <span className="font-body-sm text-body-sm text-on-surface">{field.label}</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{field.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Preview */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h3 className="font-headline-md text-headline-md text-primary mb-6">Export Preview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="material-symbols-outlined text-primary mr-2">description</span>
              <span className="font-body-sm text-body-sm text-primary">Records</span>
            </div>
            <p className="font-display-sm text-display-sm text-primary">{preview.count}</p>
          </div>
          
          <div className="bg-surface-container rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="material-symbols-outlined text-primary mr-2">payments</span>
              <span className="font-body-sm text-body-sm text-primary">Total Amount</span>
            </div>
            <p className="font-display-sm text-display-sm text-primary">
              {formatCurrency(preview.totalAmount)}
            </p>
          </div>
          
          <div className="bg-surface-container rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="material-symbols-outlined text-primary mr-2">calendar_month</span>
              <span className="font-body-sm text-body-sm text-primary">Date Range</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant capitalize">{preview.dateRange}</p>
          </div>
        </div>
      </div>

      {/* Export Result */}
      {exportResult && (
        <div className={`rounded-lg p-4 ${
          exportResult.success
            ? 'bg-success-container text-on-success-container border border-success'
            : 'bg-error-container text-on-error-container border border-error'
        }`}>
          <div className="flex items-start">
            {exportResult.success ? (
              <span className="material-symbols-outlined text-success mt-0.5 mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-error mt-0.5 mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            )}
            <div>
              <p className={`font-body-base text-body-base ${
                exportResult.success ? 'text-success' : 'text-error'
              }`}>
                {exportResult.message}
              </p>
              {exportResult.filename && (
                <p className="font-body-sm text-body-sm text-success mt-1">
                  File saved as: {exportResult.filename}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-center">
        <button
          onClick={handleExport}
          disabled={isExporting || preview.count === 0}
          className={`flex items-center px-6 py-3 rounded-lg font-label-caps text-label-caps ${
            isExporting || preview.count === 0
              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              : 'bg-primary text-on-primary hover:opacity-90'
          }`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary mr-2"></div>
              Exporting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">download</span>
              Export {preview.count} Expenses
            </>
          )}
        </button>
      </div>
    </div>
  );
};
