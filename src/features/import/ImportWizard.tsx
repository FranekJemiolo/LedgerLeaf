import React, { useState, useRef } from 'react';
import { useAppStore } from '../../lib/store';
import * as XLSX from 'xlsx';

interface ImportedExpense {
  name: string;
  amount: number;
  currency: string;
  frequency?: string;
  category?: string[];
  notes?: string;
  detectedRecurring: boolean;
  confidence: number;
}

interface ImportStep {
  id: string;
  title: string;
  description: string;
}

export const ImportWizard: React.FC = () => {
  const { addExpense } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedExpense[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: ImportStep[] = [
    {
      id: 'upload',
      title: 'Upload File',
      description: 'Select a CSV or Excel file containing your expense data',
    },
    {
      id: 'preview',
      title: 'Preview & Review',
      description: 'Review detected expenses and select which ones to import',
    },
    {
      id: 'mapping',
      title: 'Map Fields',
      description: 'Confirm how fields should be mapped to LedgerLeaf format',
    },
    {
      id: 'complete',
      title: 'Import Complete',
      description: 'Your expenses have been successfully imported',
    },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      processFile(uploadedFile);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setIsProcessing(true);
    try {
      const data = await readFile(uploadedFile);
      const detectedExpenses = detectRecurringExpenses(data);
      setImportedData(detectedExpenses);
      setCurrentStep(1);
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const readFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const detectRecurringExpenses = (data: any[]): ImportedExpense[] => {
    const detected: ImportedExpense[] = [];
    
    for (const row of data) {
      const expense = analyzeRowForRecurring(row);
      if (expense) {
        detected.push(expense);
      }
    }
    
    return detected;
  };

  const analyzeRowForRecurring = (row: any): ImportedExpense | null => {
    // Try to detect expense information from the row
    const keys = Object.keys(row);
    
    // Look for common field names
    const nameField = keys.find(k => 
      k.toLowerCase().includes('name') || 
      k.toLowerCase().includes('description') ||
      k.toLowerCase().includes('merchant')
    );
    
    const amountField = keys.find(k => 
      k.toLowerCase().includes('amount') || 
      k.toLowerCase().includes('cost') ||
      k.toLowerCase().includes('price')
    );
    
    const dateField = keys.find(k => 
      k.toLowerCase().includes('date') ||
      k.toLowerCase().includes('time')
    );
    
    const categoryField = keys.find(k => 
      k.toLowerCase().includes('category') ||
      k.toLowerCase().includes('type')
    );
    
    if (!nameField || !amountField) {
      return null;
    }
    
    const name = String(row[nameField] || '').trim();
    const amount = parseFloat(String(row[amountField] || '0').replace(/[$,]/g, ''));
    
    if (!name || isNaN(amount) || amount <= 0) {
      return null;
    }
    
    // Detect recurring patterns
    const recurringPatterns = [
      /subscription/i,
      /monthly/i,
      /annual/i,
      /yearly/i,
      /weekly/i,
      /netflix/i,
      /spotify/i,
      /gym/i,
      /insurance/i,
      /utility/i,
      /phone/i,
      /internet/i,
    ];
    
    const isRecurring = recurringPatterns.some(pattern => pattern.test(name));
    
    // Detect frequency
    let frequency: string = 'monthly'; // default
    if (name.toLowerCase().includes('weekly')) frequency = 'weekly';
    else if (name.toLowerCase().includes('yearly') || name.toLowerCase().includes('annual')) frequency = 'yearly';
    else if (name.toLowerCase().includes('daily')) frequency = 'daily';
    else if (name.toLowerCase().includes('quarterly')) frequency = 'quarterly';
    
    // Calculate confidence based on detection quality
    let confidence = 0.5; // base confidence
    if (isRecurring) confidence += 0.3;
    if (categoryField) confidence += 0.1;
    if (dateField) confidence += 0.1;
    
    return {
      name,
      amount,
      currency: 'USD', // default, could be enhanced
      frequency,
      category: categoryField ? [String(row[categoryField])] : [],
      notes: dateField ? `Imported date: ${row[dateField]}` : '',
      detectedRecurring: isRecurring,
      confidence: Math.min(confidence, 1),
    };
  };

  const toggleExpenseSelection = (index: number) => {
    const newSelected = new Set(selectedExpenses);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedExpenses(newSelected);
  };

  const selectAllExpenses = () => {
    setSelectedExpenses(new Set(importedData.map((_, index) => index)));
  };

  const deselectAllExpenses = () => {
    setSelectedExpenses(new Set());
  };

  const handleImport = async () => {
    setIsProcessing(true);
    const results = { success: 0, errors: [] };
    
    try {
      for (const index of selectedExpenses) {
        const importedExpense = importedData[index];
        
        try {
          const expenseData = {
            name: importedExpense.name,
            type: (importedExpense.detectedRecurring ? 'subscription' : 'other') as 'subscription' | 'service' | 'obligation' | 'utility' | 'insurance' | 'other',
            status: 'active' as const,
            cost: {
              amount: importedExpense.amount,
              currency: importedExpense.currency,
            },
            billing: {
              frequency: importedExpense.frequency as any,
              interval: 1,
            },
            category: importedExpense.category || [],
            reminders: {
              enabled: true,
              days_before: 3,
            },
            usage_tracking: {
              enabled: true,
              remind_after_days_unused: 45,
            },
            notes: importedExpense.notes || `Imported from file - Confidence: ${(importedExpense.confidence * 100).toFixed(0)}%`,
            tags: importedExpense.detectedRecurring ? ['imported', 'recurring'] : ['imported'],
          };
          
          await addExpense(expenseData);
          results.success++;
        } catch (error) {
          results.errors.push(`Failed to import "${importedExpense.name}": ${error}`);
        }
      }
      
      setImportResults(results);
      setCurrentStep(3);
    } catch (error) {
      console.error('Import failed:', error);
      results.errors.push(`Import failed: ${error}`);
      setImportResults(results);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setFile(null);
    setImportedData([]);
    setSelectedExpenses(new Set());
    setImportResults({ success: 0, errors: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-outline-variant rounded-lg p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">upload_file</span>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Upload your expense file</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                Supports CSV, Excel (.xlsx, .xls) files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent font-body-sm text-body-sm rounded-lg text-on-primary bg-primary hover:opacity-90 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            
            {isProcessing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Processing file...</p>
              </div>
            )}
            
            {file && !isProcessing && (
              <div className="bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary rounded-lg p-4">
                <div className="flex items-center">
                  <span className="material-symbols-outlined text-tertiary mr-2">description</span>
                  <span className="font-body-base text-body-base text-on-tertiary-fixed">{file.name}</span>
                </div>
              </div>
            )}
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary">Detected Expenses</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllExpenses}
                  className="px-3 py-1 font-body-sm text-body-sm border border-outline-variant rounded hover:bg-surface-container-low"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllExpenses}
                  className="px-3 py-1 font-body-sm text-body-sm border border-outline-variant rounded hover:bg-surface-container-low"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {importedData.map((expense, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedExpenses.has(index)
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant hover:border-outline'
                  }`}
                  onClick={() => toggleExpenseSelection(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={selectedExpenses.has(index)}
                          onChange={() => toggleExpenseSelection(index)}
                          className="h-4 w-4 text-primary"
                        />
                        <span className="font-body-base text-body-base text-on-surface">{expense.name}</span>
                        {expense.detectedRecurring && (
                          <span className="px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed font-body-sm text-body-sm rounded">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        {formatCurrency(expense.amount, expense.currency)} • {expense.frequency}
                      </div>
                      {expense.category && expense.category.length > 0 && (
                        <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Category: {expense.category.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className={`px-2 py-1 rounded-full font-body-sm text-body-sm ${getConfidenceColor(expense.confidence)}`}>
                        {(expense.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-primary-container text-on-primary-container border border-primary rounded-lg p-4">
              <div className="flex items-start">
                <span className="material-symbols-outlined text-primary mt-0.5 mr-2">info</span>
                <div className="font-body-sm text-body-sm text-on-primary-container">
                  <p className="font-body-base text-body-base mb-1">Import Summary</p>
                  <p>Selected {selectedExpenses.size} of {importedData.length} detected expenses</p>
                  <p>Total: {formatCurrency(
                    Array.from(selectedExpenses).reduce((sum, index) => sum + importedData[index].amount, 0)
                  )}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-center">
          <button
            onClick={resetWizard}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-label-caps hover:opacity-90"
          >
            Import Another File
          </button>
        </div>
      </div>
    );
    
  default:
    return null;
}
};

const canGoNext = () => {
switch (currentStep) {
  case 0:
    return file !== null && importedData.length > 0;
  case 1:
    return selectedExpenses.size > 0;
  case 2:
    return true;
  default:
    return false;
}
};

return (
  <div className="max-w-4xl mx-auto space-y-6">
    {/* Header */}
    <div className="text-center space-y-2">
      <h2 className="font-headline-md text-headline-md text-primary">Wizard</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant">Import your expense data from CSV or Excel files</p>
    </div>
    
    {/* Stepper */}
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center space-x-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-label-caps text-label-caps ${
            index <= currentStep
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant'
          }`}>
            {index + 1}
          </div>
          <div className={`h-0.5 w-16 ${
            index < currentStep ? 'bg-primary' : 'bg-surface-container'
          }`} />
        </div>
      ))}
    </div>
    
    {/* Step Content */}
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
      {renderStep()}
    </div>
    
    {/* Navigation */}
    {currentStep < 3 && (
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className={`flex items-center px-4 py-2 rounded-lg font-label-caps text-label-caps ${
            currentStep === 0
              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              : 'bg-primary text-on-primary hover:opacity-90'
          }`}
        >
          <span className="material-symbols-outlined">chevron_left</span>
          Previous
        </button>
        
        {currentStep === 2 ? (
          <button
            onClick={handleImport}
            disabled={!canGoNext() || isProcessing}
            className={`flex items-center px-4 py-2 rounded-lg font-label-caps text-label-caps ${
              !canGoNext() || isProcessing
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                Import Expenses
                <span className="material-symbols-outlined">chevron_right</span>
              </>
            )}
        
      default:
        return null;
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return file !== null && importedData.length > 0;
      case 1:
        return selectedExpenses.size > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="font-headline-md text-headline-md text-primary">Wizard</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Import your expense data from CSV or Excel files</p>
      </div>
      
      {/* Stepper */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-label-caps text-label-caps ${
              index <= currentStep
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}>
              {index + 1}
            </div>
            <div className={`h-0.5 w-16 ${
              index < currentStep ? 'bg-primary' : 'bg-surface-container'
            }`} />
          </div>
        ))}
      </div>
      
      {/* Step Content */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        {renderStep()}
      </div>
      
      {/* Navigation */}
      {currentStep < 3 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 rounded-lg font-label-caps text-label-caps ${
              currentStep === 0
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
            Previous
          </button>
          
          {currentStep === 2 ? (
            <button
              onClick={handleImport}
              disabled={!canGoNext() || isProcessing}
              className={`flex items-center px-4 py-2 rounded-lg font-label-caps text-label-caps ${
                !canGoNext() || isProcessing
                  ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-on-primary mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  Import Expenses
                  <span className="material-symbols-outlined">chevron_right</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={!canGoNext()}
              className={`flex items-center px-4 py-2 rounded-lg font-label-caps text-label-caps ${
                !canGoNext()
                  ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              Next
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
