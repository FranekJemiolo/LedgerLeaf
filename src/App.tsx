import { useEffect, useState } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { ExpenseTable } from './features/expenses/ExpenseTable';
import { ExpenseEditor } from './features/expenses/ExpenseEditor';
import { Expense } from './types';
import { useAppStore } from './lib/store';
import { BarChart3, List, Settings, Calendar, Import, FileText } from 'lucide-react';

type Tab = 'dashboard' | 'expenses' | 'calendar' | 'import' | 'settings';

function App() {
  const { initializeApp, error, loading } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleExpenseSelect = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditor(true);
  };

  const handleExpenseEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditor(true);
  };

  const handleExpenseCreate = () => {
    setSelectedExpense(undefined);
    setShowEditor(true);
  };

  const handleEditorSave = () => {
    setShowEditor(false);
    setSelectedExpense(undefined);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedExpense(undefined);
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: BarChart3 },
    { id: 'expenses' as Tab, label: 'Expenses', icon: List },
    { id: 'calendar' as Tab, label: 'Calendar', icon: Calendar },
    { id: 'import' as Tab, label: 'Import', icon: Import },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading LedgerLeaf...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading App</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LedgerLeaf</h1>
              <span className="ml-2 text-sm text-gray-500">Local-First Expense Tracker</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'expenses' && (
          <ExpenseTable
            onExpenseSelect={handleExpenseSelect}
            onExpenseEdit={handleExpenseEdit}
            onExpenseCreate={handleExpenseCreate}
          />
        )}
        {activeTab === 'calendar' && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar View</h2>
            <p className="text-gray-600">Calendar view coming soon</p>
          </div>
        )}
        {activeTab === 'import' && (
          <div className="text-center py-12">
            <Import className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Import/Export</h2>
            <p className="text-gray-600">Import and export features coming soon</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon</p>
          </div>
        )}
      </main>

      {/* Expense Editor Modal */}
      <ExpenseEditor
        expense={selectedExpense}
        isOpen={showEditor}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />
    </div>
  );
}

export default App;
