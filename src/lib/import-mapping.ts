import { Expense, ExpenseSchema } from '../types';

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ImportMapping {
  [expenseField: string]: string; // Maps expense field to import column
}

export interface ImportMappingResult {
  mapping: ImportMapping;
  confidence: number; // 0-100
  suggestions: {
    field: string;
    suggestedColumn: string;
    reason: string;
  }[];
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleData: any[];
  mappedData: any[];
}

export class ImportMappingService {
  private readonly EXPENSE_FIELDS: ImportField[] = [
    {
      key: 'name',
      label: 'Expense Name',
      required: true,
      type: 'text',
      validation: { pattern: '^[a-zA-Z0-9\\s\\-]+$' }
    },
    {
      key: 'type',
      label: 'Type',
      required: true,
      type: 'select',
      options: ['subscription', 'service', 'obligation', 'utility', 'insurance', 'other']
    },
    {
      key: 'status',
      label: 'Status',
      required: true,
      type: 'select',
      options: ['active', 'inactive', 'cancelled', 'paused']
    },
    {
      key: 'amount',
      label: 'Amount',
      required: true,
      type: 'number',
      validation: { min: 0 }
    },
    {
      key: 'currency',
      label: 'Currency',
      required: true,
      type: 'text',
      validation: { pattern: '^[A-Z]{3}$' }
    },
    {
      key: 'frequency',
      label: 'Billing Frequency',
      required: true,
      type: 'select',
      options: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    {
      key: 'interval',
      label: 'Billing Interval',
      required: true,
      type: 'number',
      validation: { min: 1 }
    },
    {
      key: 'due_day',
      label: 'Due Day',
      required: false,
      type: 'number',
      validation: { min: 1, max: 31 }
    },
    {
      key: 'category',
      label: 'Category',
      required: false,
      type: 'multiselect',
      options: ['subscription', 'entertainment', 'utilities', 'food', 'transport', 'healthcare', 'insurance', 'other']
    },
    {
      key: 'tags',
      label: 'Tags',
      required: false,
      type: 'text'
    },
    {
      key: 'notes',
      label: 'Notes',
      required: false,
      type: 'text'
    }
  ];

  detectColumns(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') return [];
    
    return Object.keys(firstRow).filter(key => 
      key && typeof key === 'string' && key.trim().length > 0
    );
  }

  suggestMapping(importData: any[]): ImportMappingResult {
    const columns = this.detectColumns(importData);
    const mapping: ImportMapping = {};
    const suggestions: any[] = [];
    let totalConfidence = 0;

    // Analyze column headers and content to suggest mappings
    columns.forEach(column => {
      const columnKey = column.toLowerCase().trim();
      const suggestion = this.analyzeColumnForMapping(columnKey, importData);
      
      if (suggestion) {
        mapping[suggestion.field] = column;
        suggestions.push(suggestion);
        totalConfidence += suggestion.confidence || 0;
      }
    });

    const averageConfidence = columns.length > 0 ? totalConfidence / columns.length : 0;
    
    return {
      mapping,
      confidence: Math.min(averageConfidence, 100),
      suggestions
    };
  }

  private analyzeColumnForMapping(columnKey: string, importData: any[]): {
    field: string;
    suggestedColumn: string;
    reason: string;
    confidence?: number;
  } | null {
    const columnKeyLower = columnKey.toLowerCase();
    const sampleData = importData.slice(0, Math.min(10, importData.length));
    
    // Name field detection
    if (this.containsAny(columnKeyLower, ['name', 'expense', 'description', 'item', 'product'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'name');
      return {
        field: 'name',
        suggestedColumn: columnKey,
        reason: `Column appears to contain expense names (${confidence}% confidence)`,
        confidence
      };
    }

    // Amount field detection
    if (this.containsAny(columnKeyLower, ['amount', 'cost', 'price', 'total', 'value', 'fee'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'amount');
      return {
        field: 'amount',
        suggestedColumn: columnKey,
        reason: `Column appears to contain monetary amounts (${confidence}% confidence)`,
        confidence
      };
    }

    // Type field detection
    if (this.containsAny(columnKeyLower, ['type', 'category', 'kind', 'class'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'type');
      return {
        field: 'type',
        suggestedColumn: columnKey,
        reason: `Column appears to contain expense types (${confidence}% confidence)`,
        confidence
      };
    }

    // Status field detection
    if (this.containsAny(columnKeyLower, ['status', 'state', 'active'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'status');
      return {
        field: 'status',
        suggestedColumn: columnKey,
        reason: `Column appears to contain status information (${confidence}% confidence)`,
        confidence
      };
    }

    // Currency field detection
    if (this.containsAny(columnKeyLower, ['currency', 'symbol', 'iso'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'currency');
      return {
        field: 'currency',
        suggestedColumn: columnKey,
        reason: `Column appears to contain currency codes (${confidence}% confidence)`,
        confidence
      };
    }

    // Frequency field detection
    if (this.containsAny(columnKeyLower, ['frequency', 'period', 'cycle', 'recurring'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'frequency');
      return {
        field: 'frequency',
        suggestedColumn: columnKey,
        reason: `Column appears to contain billing frequency (${confidence}% confidence)`,
        confidence
      };
    }

    // Date field detection
    if (this.containsAny(columnKeyLower, ['date', 'due', 'when', 'start', 'end'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'due_day');
      return {
        field: 'due_day',
        suggestedColumn: columnKey,
        reason: `Column appears to contain dates (${confidence}% confidence)`,
        confidence
      };
    }

    // Category field detection
    if (this.containsAny(columnKeyLower, ['category', 'class', 'group', 'department'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'category');
      return {
        field: 'category',
        suggestedColumn: columnKey,
        reason: `Column appears to contain categories (${confidence}% confidence)`,
        confidence
      };
    }

    // Notes field detection
    if (this.containsAny(columnKeyLower, ['notes', 'description', 'comments', 'remarks'])) {
      const confidence = this.calculateConfidence(columnKeyLower, sampleData, 'notes');
      return {
        field: 'notes',
        suggestedColumn: columnKey,
        reason: `Column appears to contain notes (${confidence}% confidence)`,
        confidence
      };
    }

    return null;
  }

  private calculateConfidence(columnKey: string, sampleData: any[], expectedField: string): number {
    if (!sampleData || sampleData.length === 0) return 0;

    let confidence = 0;
    let validSamples = 0;
    let totalSamples = 0;

    sampleData.forEach(row => {
      const value = row[columnKey];
      if (value !== null && value !== undefined && value !== '') {
        totalSamples++;
        
        if (this.isValidForField(value, expectedField)) {
          validSamples++;
        }
      }
    });

    if (totalSamples > 0) {
      confidence = (validSamples / totalSamples) * 100;
    }

    // Boost confidence for exact keyword matches
    const exactMatches = this.getExactMatches(expectedField);
    if (exactMatches.some(match => columnKey.toLowerCase().includes(match))) {
      confidence = Math.min(confidence + 20, 100);
    }

    return Math.round(confidence);
  }

  private isValidForField(value: any, expectedField: string): boolean {
    const stringValue = String(value).toLowerCase().trim();
    
    switch (expectedField) {
      case 'name':
        return stringValue.length > 0 && !/^\d+$/.test(stringValue);
      
      case 'amount':
        return /^\d+\.?\d*$/.test(stringValue.replace(/[$,]/g, ''));
      
      case 'currency':
        return /^[A-Z]{3}$/.test(stringValue);
      
      case 'type':
        const validTypes = ['subscription', 'service', 'obligation', 'utility', 'insurance', 'other'];
        return validTypes.includes(stringValue);
      
      case 'status':
        const validStatuses = ['active', 'inactive', 'cancelled', 'paused'];
        return validStatuses.includes(stringValue);
      
      case 'frequency':
        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        return validFrequencies.includes(stringValue);
      
      case 'category':
        return stringValue.length > 0;
      
      case 'notes':
        return stringValue.length > 0;
      
      default:
        return true;
    }
  }

  private getExactMatches(field: string): string[] {
    const matches: Record<string, string[]> = {
      name: ['name', 'expense', 'item'],
      amount: ['amount', 'cost', 'price', 'total'],
      type: ['type', 'category'],
      status: ['status', 'state'],
      currency: ['currency', 'iso'],
      frequency: ['frequency', 'period'],
      due_day: ['date', 'due', 'when'],
      category: ['category', 'group'],
      notes: ['notes', 'description', 'comments']
    };
    
    return matches[field] || [];
  }

  private containsAny(str: string, substrings: string[]): boolean {
    return substrings.some(sub => str.toLowerCase().includes(sub));
  }

  applyMapping(data: any[], mapping: ImportMapping): ImportPreview {
    let validRows = 0;
    let invalidRows = 0;
    const mappedData: any[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      try {
        const mappedRow: any = {};
        let isValid = true;

        // Apply mapping to each field
        Object.entries(mapping).forEach(([expenseField, columnKey]) => {
          const value = row[columnKey];
          
          if (value !== undefined && value !== null) {
            mappedRow[expenseField] = this.transformValue(expenseField, value);
          } else if (this.isRequiredField(expenseField)) {
            isValid = false;
            errors.push(`Row ${index + 1}: Missing required field '${expenseField}'`);
          }
        });

        if (isValid) {
          mappedData.push(mappedRow);
          validRows++;
        } else {
          invalidRows++;
        }
      } catch (error) {
        invalidRows++;
        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    return {
      totalRows: data.length,
      validRows,
      invalidRows,
      sampleData: mappedData.slice(0, 5), // Return first 5 rows as preview
      mappedData
    };
  }

  private transformValue(field: string, value: any): any {
    const stringValue = String(value).trim();
    
    switch (field) {
      case 'amount':
        const numericValue = parseFloat(stringValue.replace(/[^0-9.]/g, ''));
        return isNaN(numericValue) ? 0 : numericValue;
      
      case 'type':
      case 'status':
      case 'frequency':
        return stringValue.toLowerCase();
      
      case 'category':
      case 'tags':
        return stringValue.split(',').map((tag: string) => tag.trim()).filter(tag => tag.length > 0);
      
      case 'due_day':
        const dayValue = parseInt(stringValue);
        return isNaN(dayValue) ? null : Math.min(Math.max(dayValue, 1), 31);
      
      default:
        return stringValue;
    }
  }

  private isRequiredField(field: string): boolean {
    return this.EXPENSE_FIELDS.find(f => f.key === field)?.required || false;
  }

  validateMappedData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = true;

    data.forEach((row, index) => {
      try {
        // Validate against expense schema
        const expense = this.convertRowToExpense(row);
        if (expense) {
          ExpenseSchema.parse(expense);
        }
      } catch (error) {
        isValid = false;
        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    return { isValid, errors };
  }

  private convertRowToExpense(row: any): Partial<Expense> | null {
    if (!row || typeof row !== 'object') return null;

    return {
      name: row.name,
      type: row.type,
      status: row.status,
      cost: {
        amount: row.amount || 0,
        currency: row.currency || 'USD'
      },
      billing: {
        frequency: row.frequency || 'monthly',
        interval: parseInt(row.interval) || 1,
        due_day: row.due_day || 1
      },
      category: Array.isArray(row.category) ? row.category : (row.category ? [row.category] : []),
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? row.tags.split(',').map(t => t.trim()) : []),
      notes: row.notes
    };
  }

  getExpenseFields(): ImportField[] {
    return this.EXPENSE_FIELDS;
  }

  detectRecurringExpenses(data: any[]): {
    recurring: any[];
    oneTime: any[];
    confidence: number;
  } {
    const recurring: any[] = [];
    const oneTime: any[] = [];
    let confidence = 0;

    data.forEach(row => {
      const hasRecurringIndicators = 
        row.frequency && row.frequency !== 'one-time' ||
        /monthly|weekly|daily|yearly|quarterly/i.test(String(row.frequency)) ||
        /recurring|subscription/i.test(String(row.name || ''));

      if (hasRecurringIndicators) {
        recurring.push(row);
        confidence += 0.8;
      } else {
        oneTime.push(row);
        confidence += 0.2;
      }
    });

    const totalConfidence = data.length > 0 ? (confidence / data.length) * 100 : 0;

    return {
      recurring,
      oneTime,
      confidence: Math.round(totalConfidence)
    };
  }
}

// Singleton instance
export const importMappingService = new ImportMappingService();
