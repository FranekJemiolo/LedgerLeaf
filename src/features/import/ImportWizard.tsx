import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your expense file</h3>
              <p className="text-gray-600 mb-4">
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            
            {isProcessing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing file...</p>
              </div>
            )}
            
            {file && !isProcessing && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">{file.name}</span>
                </div>
              </div>
            )}
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Detected Expenses</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllExpenses}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllExpenses}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
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
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
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
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="font-medium text-gray-900">{expense.name}</span>
                        {expense.detectedRecurring && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(expense.amount, expense.currency)} • {expense.frequency}
                      </div>
                      {expense.category && expense.category.length > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          Category: {expense.category.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(expense.confidence)}`}>
                        {(expense.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Import Summary</p>
                  <p>Selected {selectedExpenses.size} of {importedData.length} detected expenses</p>
                  <p>Total: {formatCurrency(
                    Array.from(selectedExpenses).reduce((sum, index) => sum + importedData[index].amount, 0)
                  )}</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Field Mapping</h3>
            <p className="text-gray-600">
              Review how your data will be mapped to LedgerLeaf fields
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Detected Mappings:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">Auto-detected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">Auto-detected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frequency:</span>
                  <span className="font-medium">Pattern-based detection</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency:</span>
                  <span className="font-medium">USD (default)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">Subscription (if recurring detected)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Note</p>
                  <p>You can edit the imported expenses after import to adjust any fields or add additional information.</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            {importResults.success > 0 ? (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Successful!</h3>
                <p className="text-gray-600 mb-4">
                  {importResults.success} expenses have been imported successfully
                </p>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Failed</h3>
                <p className="text-gray-600 mb-4">
                  No expenses could be imported
                </p>
              </div>
            )}
            
            {importResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {importResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={resetWizard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Expenses</h1>
        <p className="text-gray-600">Import your expense data from CSV or Excel files</p>
      </div>
      
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderStep()}
      </div>
      
      {/* Navigation */}
      {currentStep < 3 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 border rounded-lg ${
              currentStep === 0
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>
          
          {currentStep === 2 ? (
            <button
              onClick={handleImport}
              disabled={!canGoNext() || isProcessing}
              className={`flex items-center px-4 py-2 rounded-lg ${
                !canGoNext() || isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  Import Expenses
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={!canGoNext()}
              className={`flex items-center px-4 py-2 rounded-lg ${
                !canGoNext()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
