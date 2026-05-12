import { useEffect, useState } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { ExpenseTable } from './features/expenses/ExpenseTable';
import { ExpenseEditor } from './features/expenses/ExpenseEditor';
import { Calendar } from './features/calendar/Calendar';
import { ImportWizard } from './features/import/ImportWizard';
import { Settings } from './features/settings/Settings';
import { Expense } from './types';
import { useAppStore } from './lib/store';
import { storageMigrationService } from './lib/storage-migration';
import { MigrationModal } from './features/migration/MigrationModal';

type Tab = 'dashboard' | 'expenses' | 'calendar' | 'import' | 'settings';

function App() {
  const { initializeApp, error, loading } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [showEditor, setShowEditor] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  useEffect(() => {
    initializeApp();
    
    // Check if migration is needed after app initialization
    const checkMigration = async () => {
      try {
        const status = await storageMigrationService.getMigrationStatus();
        if (status.needsMigration) {
          setShowMigrationModal(true);
        }
      } catch (error) {
        console.error('Failed to check migration status:', error);
      }
    };
    
    checkMigration();
  }, [initializeApp]);

  const handleExpenseSelect = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditor(true);
  };

  const handleMigrationComplete = () => {
    setShowMigrationModal(false);
  };

  const handleExpenseCreate = () => {
    setSelectedExpense(undefined);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedExpense(undefined);
  };

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: 'dashboard' },
    { id: 'expenses' as Tab, label: 'Inventory', icon: 'list_alt' },
    { id: 'calendar' as Tab, label: 'Calendar', icon: 'calendar_today' },
    { id: 'import' as Tab, label: 'Wizard', icon: 'auto_awesome' },
    { id: 'settings' as Tab, label: 'Settings', icon: 'settings' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading LedgerLeaf...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center">
          <div className="text-error mb-4">
            <span className="material-symbols-outlined text-4xl">error</span>
          </div>
          <h2 className="text-xl font-semibold text-on-surface mb-2">Error Loading App</h2>
          <p className="text-on-surface-variant mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body-base min-h-screen pb-20">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant flex items-center justify-between px-container-padding h-touch-target">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
          <h1 className="font-display-sm text-display-sm tracking-tight">LedgerLeaf</h1>
        </div>
        <button 
          onClick={handleExpenseCreate}
          className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="mt-touch-target mb-16 px-container-padding pt-6 space-y-6 pb-12 max-w-4xl mx-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'expenses' && (
          <ExpenseTable
            onExpenseSelect={handleExpenseSelect}
            onExpenseEdit={handleExpenseSelect}
            onExpenseCreate={handleExpenseCreate}
          />
        )}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'import' && <ImportWizard />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full h-16 flex justify-around items-center bg-surface border-t border-outline-variant pb-safe z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center px-4 py-1 transition-transform active:scale-95 duration-150 ${
              activeTab === tab.id
                ? 'text-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {tab.icon}
            </span>
            <span className="font-label-caps text-label-caps">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Expense Editor Modal */}
      {showEditor && (
        <ExpenseEditor
          expense={selectedExpense}
          isOpen={showEditor}
          onClose={handleEditorClose}
          onSave={handleEditorClose}
        />
      )}
      
      {showMigrationModal && (
        <MigrationModal
          isOpen={showMigrationModal}
          onClose={handleMigrationComplete}
          onComplete={handleMigrationComplete}
        />
      )}
    </div>
  );
}

export default App;
