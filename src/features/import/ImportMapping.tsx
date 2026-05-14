import React, { useState, useEffect } from 'react';
import { importMappingService } from '../../lib/import-mapping';
import type { ImportMapping, ImportMappingResult, ImportPreview } from '../../lib/import-mapping';

interface ImportMappingProps {
  importData: any[];
  onMappingComplete: (mapping: ImportMapping) => void;
  onBack: () => void;
}

export const ImportMappingComponent: React.FC<ImportMappingProps> = ({ 
  importData, 
  onMappingComplete, 
  onBack 
}) => {
  const [selectedMapping, setSelectedMapping] = useState<ImportMapping>({});
  const [mappingResult, setMappingResult] = useState<ImportMappingResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  useEffect(() => {
    if (importData && importData.length > 0) {
      const result = importMappingService.suggestMapping(importData);
      
      // Auto-select high-confidence mappings
      const autoMapping: ImportMapping = {};
      result.suggestions.forEach(suggestion => {
        if (suggestion.confidence > 70) {
          autoMapping[suggestion.field] = suggestion.suggestedColumn;
        }
      });
      
      setMappingResult(result);
      setSelectedMapping(autoMapping);
    }
  }, [importData]);

  const handleFieldMapping = (expenseField: string, columnKey: string) => {
    setSelectedMapping(prev => ({
      ...prev,
      [expenseField]: columnKey
    }));
  };

  const handleApplyMapping = () => {
    if (Object.keys(selectedMapping).length === 0) {
      window.alert('Please map at least one required field (Name, Type, Status, Amount, Currency)');
      return;
    }

    const result = importMappingService.applyMapping(importData, selectedMapping);
    setPreview(result);
  };

  const handleConfirmMapping = () => {
    if (preview && preview.validRows > 0) {
      onMappingComplete(selectedMapping);
    } else {
      window.alert('No valid data to import. Please check your mapping and try again.');
    }
  };

  const getConfidenceColor = (confidence: number | undefined): string => {
    if (confidence && confidence >= 80) return 'text-green-600';
    if (confidence && confidence >= 60) return 'text-yellow-600';
    if (confidence && confidence >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const requiredFields = importMappingService.getExpenseFields().filter(field => field.required);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Map Import Fields</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>
        </div>

        {mappingResult && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Mapping Analysis Complete
            </h3>
            <p className="text-blue-800 mb-4">
              Confidence: {mappingResult.confidence}%
            </p>
            <div className="space-y-2">
              {mappingResult.suggestions.map((suggestion: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{suggestion.field}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-blue-600">{suggestion.suggestedColumn}</span>
                  </div>
                  <div className={`text-sm ${getConfidenceColor(suggestion.confidence)}`}>
                    {suggestion.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Available Fields */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Fields</h3>
            <div className="space-y-3">
              {importMappingService.getExpenseFields().map(field => (
                <div key={field.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{field.label}</h4>
                    {field.required && (
                      <span className="text-red-500 text-sm">Required</span>
                    )}
                  </div>
                  <select
                    value={selectedMapping[field.key] || ''}
                    onChange={(e) => handleFieldMapping(field.key, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select column...</option>
                    {importData && importData.length > 0 && importMappingService.detectColumns(importData).map(column => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Preview</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              {importData && importData.length > 0 ? (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Showing first 5 rows of {importData.length} total rows
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {importMappingService.detectColumns(importData).map(column => (
                            <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {importMappingService.detectColumns(importData).map(column => (
                              <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {String(row[column] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data to preview
                </div>
              )}
            </div>

            {preview && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Mapped Data Preview</h4>
                <div className="text-sm text-gray-600 mb-4">
                  {preview.validRows} of {preview.totalRows} rows will be imported
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {requiredFields.map(field => (
                          <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.sampleData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {requiredFields.map(field => (
                            <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {String(row[field.key] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <div className="space-x-3">
            <button
              onClick={handleApplyMapping}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Apply Mapping
            </button>
            <button
              onClick={handleConfirmMapping}
              disabled={!preview || preview.validRows === 0}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
