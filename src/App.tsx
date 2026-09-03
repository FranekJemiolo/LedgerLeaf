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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setShowEditor(true);
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
    <div className="bg-slate-50 text-slate-900 min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">LedgerLeaf</h1>
                <span className="text-[10px] text-emerald-600 font-semibold tracking-wider uppercase">Local-First</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExpenseCreate}
              aria-label="Add Expense"
              title="Add Expense"
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xs transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-24 md:pb-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
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

      {/* BottomNavBar on Mobile */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 w-full h-16 flex justify-around items-center bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe z-50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center px-3 py-1 transition-transform active:scale-95 ${
                activeTab === tab.id
                  ? 'text-emerald-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {tab.icon}
              </span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

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
