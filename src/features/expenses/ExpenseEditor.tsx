import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, DollarSign, Tag, Bell, CheckCircle } from 'lucide-react';
import { Expense } from '../../types';
import { useAppStore } from '../../lib/store';

interface ExpenseEditorProps {
  expense?: Expense;
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

export const ExpenseEditor: React.FC<ExpenseEditorProps> = ({
  expense,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const { addExpense, updateExpense } = useAppStore();
  const [formData, setFormData] = useState<Partial<Expense>>({
    name: '',
    type: 'other',
    status: 'active',
    cost: { amount: 0, currency: 'USD' },
    billing: { frequency: 'monthly', interval: 1 },
    category: [],
    reminders: { enabled: true, days_before: 3 },
    usage_tracking: { enabled: true, remind_after_days_unused: 45 },
    notes: '',
    tags: [],
  });

  const [categoryInput, setCategoryInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (expense) {
      setFormData(expense);
    } else {
      // Reset form for new expense
      setFormData({
        name: '',
        type: 'other',
        status: 'active',
        cost: { amount: 0, currency: 'USD' },
        billing: { frequency: 'monthly', interval: 1 },
        category: [],
        reminders: { enabled: true, days_before: 3 },
        usage_tracking: { enabled: true, remind_after_days_unused: 45 },
        notes: '',
        tags: [],
      });
    }
  }, [expense]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCostChange = (field: 'amount' | 'currency', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      cost: { ...prev.cost!, [field]: field === 'amount' ? Number(value) : value }
    }));
  };

  const handleBillingChange = (field: 'frequency' | 'interval' | 'due_day', value: any) => {
    setFormData(prev => ({
      ...prev,
      billing: { ...prev.billing!, [field]: field === 'interval' || field === 'due_day' ? Number(value) : value }
    }));
  };

  const handleRemindersChange = (field: 'enabled' | 'days_before', value: any) => {
    setFormData(prev => ({
      ...prev,
      reminders: { ...prev.reminders!, [field]: field === 'days_before' ? Number(value) : value }
    }));
  };

  const handleUsageTrackingChange = (field: 'enabled' | 'remind_after_days_unused', value: any) => {
    setFormData(prev => ({
      ...prev,
      usage_tracking: { ...prev.usage_tracking!, [field]: field === 'remind_after_days_unused' ? Number(value) : value }
    }));
  };

  const addCategory = () => {
    if (categoryInput.trim() && !formData.category?.includes(categoryInput.trim())) {
      setFormData(prev => ({
        ...prev,
        category: [...(prev.category || []), categoryInput.trim()]
      }));
      setCategoryInput('');
    }
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category?.filter(c => c !== category) || []
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  const handleSave = async () => {
    try {
      if (expense) {
        // Update existing expense
        const updatedExpense = {
          ...expense,
          ...formData,
          id: expense.id,
          metadata: {
            ...expense.metadata,
            updated_at: new Date().toISOString(),
          },
        } as Expense;
        
        await updateExpense(updatedExpense);
        onSave(updatedExpense);
      } else {
        // Create new expense
        await addExpense(formData as Omit<Expense, 'id' | 'metadata'>);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleDelete = () => {
    if (expense && onDelete) {
      onDelete(expense.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {expense ? 'Edit Expense' : 'Create Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Netflix, Gym membership, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type || 'other'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="subscription">Subscription</option>
                  <option value="service">Service</option>
                  <option value="obligation">Obligation</option>
                  <option value="utility">Utility</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this expense..."
              />
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost?.amount || ''}
                  onChange={(e) => handleCostChange('amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.cost?.currency || 'USD'}
                  onChange={(e) => handleCostChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="PLN">PLN</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing Schedule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.billing?.frequency || 'monthly'}
                  onChange={(e) => handleBillingChange('frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.billing?.interval || 1}
                  onChange={(e) => handleBillingChange('interval', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Day (for monthly/yearly)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billing?.due_day || ''}
                  onChange={(e) => handleBillingChange('due_day', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="15"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Categories
            </h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a category..."
                />
                <button
                  onClick={addCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.category?.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {category}
                    <button
                      onClick={() => removeCategory(category)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Reminders
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reminders-enabled"
                  checked={formData.reminders?.enabled || false}
                  onChange={(e) => handleRemindersChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="reminders-enabled" className="text-sm font-medium text-gray-700">
                  Enable reminders
                </label>
              </div>
              
              {formData.reminders?.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remind me (days before due)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reminders.days_before || 3}
                    onChange={(e) => handleRemindersChange('days_before', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Usage Tracking */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Usage Tracking
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usage-tracking-enabled"
                  checked={formData.usage_tracking?.enabled || false}
                  onChange={(e) => handleUsageTrackingChange('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="usage-tracking-enabled" className="text-sm font-medium text-gray-700">
                  Track usage to identify potentially unused services
                </label>
              </div>
              
              {formData.usage_tracking?.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remind if unused for (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usage_tracking.remind_after_days_unused || 45}
                    onChange={(e) => handleUsageTrackingChange('remind_after_days_unused', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div>
            {expense && onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {expense ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
