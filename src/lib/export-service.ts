import { Expense, Config } from '../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json' | 'yaml';
  includeMetadata: boolean;
  filterByStatus?: ('active' | 'inactive' | 'cancelled' | 'paused')[];
  filterByCategory?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'name' | 'amount' | 'due_date' | 'frequency' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: string;
  recordCount: number;
  fileSize: number;
  error?: string;
}

export class ExportService {
  private readonly DEFAULT_OPTIONS: Partial<ExportOptions> = {
    format: 'xlsx',
    includeMetadata: true,
    sortBy: 'name',
    sortOrder: 'asc'
  };

  async exportExpenses(
    expenses: Expense[], 
    config: Config, 
    options: ExportOptions
  ): Promise<ExportResult> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Filter expenses based on criteria
      let filteredExpenses = this.filterExpenses(expenses, mergedOptions);
      
      // Sort expenses
      filteredExpenses = this.sortExpenses(filteredExpenses, mergedOptions);
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `ledgerleaf-expenses-${timestamp}.${mergedOptions.format}`;
      
      // Export based on format
      let fileData: Blob;
      let fileSize = 0;
      
      switch (mergedOptions.format) {
        case 'xlsx':
          fileData = await this.exportToXLSX(filteredExpenses, config, mergedOptions);
          break;
        case 'csv':
          fileData = await this.exportToCSV(filteredExpenses, mergedOptions);
          break;
        case 'json':
          fileData = await this.exportToJSON(filteredExpenses, config, mergedOptions);
          break;
        case 'yaml':
          fileData = await this.exportToYAML(filteredExpenses, config, mergedOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${mergedOptions.format}`);
      }
      
      fileSize = fileData.size;
      
      // Save file
      saveAs(fileData, filename);
      
      return {
        success: true,
        filename,
        format: mergedOptions.format,
        recordCount: filteredExpenses.length,
        fileSize
      };
      
    } catch (error) {
      return {
        success: false,
        filename: '',
        format: mergedOptions.format,
        recordCount: 0,
        fileSize: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private filterExpenses(expenses: Expense[], options: ExportOptions): Expense[] {
    let filtered = [...expenses];
    
    // Filter by status
    if (options.filterByStatus && options.filterByStatus.length > 0) {
      filtered = filtered.filter(expense => 
        options.filterByStatus!.includes(expense.status)
      );
    }
    
    // Filter by category
    if (options.filterByCategory && options.filterByCategory.length > 0) {
      filtered = filtered.filter(expense => 
        expense.category.some(cat => options.filterByCategory!.includes(cat))
      );
    }
    
    // Filter by date range
    if (options.dateRange) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.metadata.created_at);
        return expenseDate >= options.dateRange!.start && expenseDate <= options.dateRange!.end;
      });
    }
    
    return filtered;
  }

  private sortExpenses(expenses: Expense[], options: ExportOptions): Expense[] {
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';
    
    return expenses.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'amount':
          aValue = a.cost.amount;
          bValue = b.cost.amount;
          break;
        case 'due_date':
          aValue = a.billing.due_day || 999;
          bValue = b.billing.due_day || 999;
          break;
        case 'frequency':
          aValue = a.billing.frequency;
          bValue = b.billing.frequency;
          break;
        case 'created_at':
          aValue = new Date(a.metadata.created_at);
          bValue = new Date(b.metadata.created_at);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private async exportToXLSX(expenses: Expense[], config: Config, options: ExportOptions): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    
    // Main expenses sheet
    const expensesSheet = workbook.addWorksheet('Expenses');
    const expensesData = expenses.map(expense => ({
      'ID': expense.id,
      'Name': expense.name,
      'Type': expense.type,
      'Status': expense.status,
      'Amount': expense.cost.amount,
      'Currency': expense.cost.currency,
      'Frequency': expense.billing.frequency,
      'Interval': expense.billing.interval,
      'Due Day': expense.billing.due_day || '',
      'Category': expense.category.join(', '),
      'Tags': expense.tags.join(', '),
      'Notes': expense.notes || '',
      'Created At': expense.metadata.created_at,
      'Updated At': expense.metadata.updated_at,
      ...(options.includeMetadata && {
        'Reminders Enabled': expense.reminders.enabled,
        'Reminders Days Before': expense.reminders.days_before,
        'Usage Tracking Enabled': expense.usage_tracking?.enabled || false,
        'Last Confirmed Use': expense.usage_tracking?.last_confirmed_use || '',
        'Remind After Days Unused': expense.usage_tracking?.remind_after_days_unused || ''
      })
    }));
    
    // Add headers
    const headers = Object.keys(expensesData[0] || {});
    expensesSheet.addRow(headers);
    
    // Add data
    expensesData.forEach(row => {
      expensesSheet.addRow(Object.values(row));
    });
    
    // Summary sheet
    const summaryData = this.generateSummaryData(expenses, config);
    const summarySheet = workbook.addWorksheet('Summary');
    const summaryHeaders = Object.keys(summaryData[0] || {});
    summarySheet.addRow(summaryHeaders);
    summaryData.forEach(row => {
      summarySheet.addRow(Object.values(row));
    });
    
    // Category breakdown sheet
    const categoryData = this.generateCategoryBreakdown(expenses);
    const categorySheet = workbook.addWorksheet('Categories');
    const categoryHeaders = Object.keys(categoryData[0] || {});
    categorySheet.addRow(categoryHeaders);
    categoryData.forEach(row => {
      categorySheet.addRow(Object.values(row));
    });
    
    // Monthly projections sheet
    const monthlyData = this.generateMonthlyProjections(expenses);
    const monthlySheet = workbook.addWorksheet('Monthly Projections');
    const monthlyHeaders = Object.keys(monthlyData[0] || {});
    monthlySheet.addRow(monthlyHeaders);
    monthlyData.forEach(row => {
      monthlySheet.addRow(Object.values(row));
    });
    
    // Convert to blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private async exportToCSV(expenses: Expense[], options: ExportOptions): Promise<Blob> {
    const csvData = expenses.map(expense => ({
      'ID': expense.id,
      'Name': expense.name,
      'Type': expense.type,
      'Status': expense.status,
      'Amount': expense.cost.amount,
      'Currency': expense.cost.currency,
      'Frequency': expense.billing.frequency,
      'Interval': expense.billing.interval,
      'Due Day': expense.billing.due_day || '',
      'Category': expense.category.join(', '),
      'Tags': expense.tags.join(', '),
      'Notes': expense.notes || '',
      'Created At': expense.metadata.created_at,
      'Updated At': expense.metadata.updated_at,
      ...(options.includeMetadata && {
        'Reminders Enabled': expense.reminders.enabled,
        'Reminders Days Before': expense.reminders.days_before,
        'Usage Tracking Enabled': expense.usage_tracking?.enabled || false,
        'Last Confirmed Use': expense.usage_tracking?.last_confirmed_use || '',
        'Remind After Days Unused': expense.usage_tracking?.remind_after_days_unused || ''
      })
    }));
    
    const csvContent = this.convertToCSV(csvData);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private async exportToJSON(expenses: Expense[], config: Config, options: ExportOptions): Promise<Blob> {
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        version: '1.0',
        config: options.includeMetadata ? config : undefined,
        record_count: expenses.length
      },
      expenses: options.includeMetadata ? expenses : expenses.map(expense => ({
        id: expense.id,
        name: expense.name,
        type: expense.type,
        status: expense.status,
        cost: expense.cost,
        billing: expense.billing,
        category: expense.category,
        tags: expense.tags,
        notes: expense.notes,
        metadata: expense.metadata
      }))
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    return new Blob([jsonContent], { type: 'application/json' });
  }

  private async exportToYAML(expenses: Expense[], config: Config, options: ExportOptions): Promise<Blob> {
    const yaml = await import('js-yaml');
    
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        version: '1.0',
        config: options.includeMetadata ? config : undefined,
        record_count: expenses.length
      },
      expenses: options.includeMetadata ? expenses : expenses.map(expense => ({
        id: expense.id,
        name: expense.name,
        type: expense.type,
        status: expense.status,
        cost: expense.cost,
        billing: expense.billing,
        category: expense.category,
        tags: expense.tags,
        notes: expense.notes,
        metadata: expense.metadata
      }))
    };
    
    const yamlContent = yaml.dump(exportData, { indent: 2 });
    return new Blob([yamlContent], { type: 'text/yaml' });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  private generateSummaryData(expenses: Expense[], config: Config): any[] {
    const activeExpenses = expenses.filter(e => e.status === 'active');
    const totalMonthly = activeExpenses.reduce((sum, expense) => {
      const monthlyAmount = this.calculateMonthlyAmount(expense);
      return sum + monthlyAmount;
    }, 0);

    return [
      { 'Metric': 'Total Expenses', 'Value': expenses.length },
      { 'Metric': 'Active Expenses', 'Value': activeExpenses.length },
      { 'Metric': 'Inactive Expenses', 'Value': expenses.filter(e => e.status === 'inactive').length },
      { 'Metric': 'Cancelled Expenses', 'Value': expenses.filter(e => e.status === 'cancelled').length },
      { 'Metric': 'Paused Expenses', 'Value': expenses.filter(e => e.status === 'paused').length },
      { 'Metric': 'Total Monthly Cost', 'Value': totalMonthly.toFixed(2) },
      { 'Metric': 'Currency', 'Value': config.currency },
      { 'Metric': 'Export Date', 'Value': new Date().toISOString().split('T')[0] }
    ];
  }

  private generateCategoryBreakdown(expenses: Expense[]): any[] {
    const categoryMap = new Map<string, { count: number; total: number }>();
    
    expenses.forEach(expense => {
      expense.category.forEach(category => {
        const existing = categoryMap.get(category) || { count: 0, total: 0 };
        const monthlyAmount = this.calculateMonthlyAmount(expense);
        categoryMap.set(category, {
          count: existing.count + 1,
          total: existing.total + monthlyAmount
        });
      });
    });
    
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      'Category': category,
      'Count': data.count,
      'Monthly Total': data.total.toFixed(2),
      'Average': (data.total / data.count).toFixed(2)
    }));
  }

  private generateMonthlyProjections(expenses: Expense[]): any[] {
    const projections: any[] = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const projectionDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthName = projectionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      let monthlyTotal = 0;
      expenses.forEach(expense => {
        if (expense.status === 'active') {
          monthlyTotal += this.calculateMonthlyAmount(expense);
        }
      });
      
      projections.push({
        'Month': monthName,
        'Projected Total': monthlyTotal.toFixed(2),
        'Year to Date': projections.reduce((sum, p) => sum + parseFloat(p['Projected Total']), monthlyTotal).toFixed(2)
      });
    }
    
    return projections;
  }

  private calculateMonthlyAmount(expense: Expense): number {
    const { amount } = expense.cost;
    const { frequency, interval } = expense.billing;
    
    switch (frequency) {
      case 'daily':
        return amount * 30;
      case 'weekly':
        return amount * (30 / 7) * interval;
      case 'monthly':
        return amount * interval;
      case 'quarterly':
        return (amount * interval) / 3;
      case 'yearly':
        return (amount * interval) / 12;
      case 'one-time':
        return 0;
      default:
        return amount;
    }
  }

  async exportTemplate(format: 'xlsx' | 'csv'): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ledgerleaf-template-${timestamp}.${format}`;
    
    try {
      let fileData: Blob;
      
      const templateData = [
        {
          'Name': 'Netflix Subscription',
          'Type': 'subscription',
          'Status': 'active',
          'Amount': 15.99,
          'Currency': 'USD',
          'Frequency': 'monthly',
          'Interval': 1,
          'Due Day': 15,
          'Category': 'entertainment',
          'Tags': 'streaming',
          'Notes': 'Premium plan with 4K streaming'
        },
        {
          'Name': 'Gym Membership',
          'Type': 'service',
          'Status': 'active',
          'Amount': 45.00,
          'Currency': 'USD',
          'Frequency': 'monthly',
          'Interval': 1,
          'Due Day': 1,
          'Category': 'health',
          'Tags': 'fitness',
          'Notes': '24-hour access gym membership'
        }
      ];
      
      if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Template');
        
        // Add headers
        const headers = Object.keys(templateData[0] || {});
        sheet.addRow(headers);
        
        // Add data
        templateData.forEach(row => {
          sheet.addRow(Object.values(row));
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        fileData = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else {
        const csvContent = this.convertToCSV(templateData);
        fileData = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      }
      
      saveAs(fileData, filename);
      
      return {
        success: true,
        filename,
        format,
        recordCount: templateData.length,
        fileSize: fileData.size
      };
      
    } catch (error) {
      return {
        success: false,
        filename: '',
        format,
        recordCount: 0,
        fileSize: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Singleton instance
export const exportService = new ExportService();
