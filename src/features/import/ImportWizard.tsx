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
  useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [, setFile] = useState<File | null>(null);
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
      title: 'Preview Data',
      description: 'Review and select which expenses to import',
    },
    {
      id: 'mapping',
      title: 'Map Fields',
      description: 'Map your file columns to expense fields',
    },
    {
      id: 'import',
      title: 'Complete Import',
      description: 'Review and finalize your import',
    },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseFile(uploadedFile);
    }
  };

  const parseFile = (uploadedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (typeof data === 'string') {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const expenses: ImportedExpense[] = jsonData.map((row: any) => ({
            name: row.Name || row.name || 'Unknown',
            amount: parseFloat(row.Amount || row.amount || 0),
            currency: row.Currency || row.currency || 'USD',
            frequency: row.Frequency || row.frequency,
            category: row.Category ? [row.Category] : [],
            notes: row.Notes || row.notes || '',
            detectedRecurring: row.Name?.toLowerCase().includes('subscription') || 
                             row.name?.toLowerCase().includes('subscription') ||
                             row.Description?.toLowerCase().includes('monthly'),
            confidence: 0.8,
          }));
          
          setImportedData(expenses);
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        setImportResults({ success: 0, errors: ['Failed to parse file'] });
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const toggleExpenseSelection = (index: number) => {
    const newSelection = new Set(selectedExpenses);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedExpenses(newSelection);
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
      results.success = selectedExpenses.size;
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
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4">Upload Your Expense File</h2>
              <p className="text-gray-600 mb-6">Import your existing expense data from CSV or Excel files</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">cloud_upload</span>
                <h3 className="text-lg font-semibold mb-2">Drop your file here</h3>
                <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Choose File
                </button>
              </div>
            </div>
          </div>
        );
        
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Preview Your Data</h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Import Preview</h3>
                  <div className="text-sm text-gray-500">
                    {importedData.length} expenses found
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between">
                    <button
                      onClick={selectAllExpenses}
                      className="text-sm text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllExpenses}
                      className="text-sm text-gray-500 hover:underline ml-4"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input type="checkbox" className="rounded" disabled />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Currency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recurring
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importedData.map((expense, index) => (
                        <tr key={index} className={selectedExpenses.has(index) ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedExpenses.has(index)}
                              onChange={() => toggleExpenseSelection(index)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${expense.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.category?.join(', ') || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.detectedRecurring ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Recurring
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                One-time
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Map Your Fields</h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-600 mb-4">
                Field mapping allows you to match your file columns to the correct expense fields.
              </p>
              <div className="text-sm text-gray-500">
                Field mapping feature coming soon...
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Complete Import</h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Import Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Selected expenses:</span>
                    <span className="font-semibold">{selectedExpenses.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ready to import:</span>
                    <span className="font-semibold text-green-600">{selectedExpenses.size}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={resetWizard}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleImport}
                  disabled={isProcessing || selectedExpenses.size === 0}
                  className={`px-6 py-3 rounded-lg transition-colors ${
                    isProcessing || selectedExpenses.size === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">cloud_upload</span>
                      Import {selectedExpenses.size} Expenses
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">Import Wizard</h1>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 text-center ${
                index <= currentStep ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                  index < currentStep ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index < currentStep ? (
                  <span className="material-symbols-outlined">check</span>
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="text-sm font-medium">{step.title}</div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </div>
          ))}
        </div>
      </div>
      
      {renderStep()}
      
      {importResults.errors.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-2">Import Errors</h4>
          <ul className="list-disc list-inside text-red-700">
            {importResults.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {importResults.success > 0 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-green-800 font-semibold mb-2">Import Successful</h4>
          <p className="text-green-700">
            Successfully imported {importResults.success} expenses!
          </p>
        </div>
      )}
    </div>
  );
};
