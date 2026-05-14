import React, { useState, useEffect } from 'react';
import { storageMigrationService } from '../../lib/storage-migration';
import { fileSystemAccessService } from '../../lib/filesystem';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ 
  isOpen, 
  onClose, 
  onComplete 
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    expensesMigrated: number;
    errors: string[];
  } | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<{
    hasLocalStorage: boolean;
    hasFilesystemAccess: boolean;
    needsMigration: boolean;
  } | null>(null);

  const checkMigrationStatus = async () => {
    try {
      const status = await storageMigrationService.getMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('Failed to check migration status:', error);
      setMigrationStatus({
        hasLocalStorage: false,
        hasFilesystemAccess: false,
        needsMigration: false
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkMigrationStatus();
    }
  }, [isOpen]);

  const handleMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await storageMigrationService.migrateFromLocalStorage();
      setMigrationResult(result);

      if (result.success) {
        // Clear localStorage after successful migration
        await storageMigrationService.clearLocalStorage();
        
        // Show success message briefly before completing
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        expensesMigrated: 0,
        errors: [`Migration failed: ${error instanceof Error ? error.message : String(error)}`]
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkipMigration = () => {
    onComplete();
  };

  const handleRequestFilesystemAccess = async () => {
    try {
      const granted = await fileSystemAccessService.requestDirectoryAccess();
      if (granted) {
        await checkMigrationStatus();
      }
    } catch (error) {
      console.error('Failed to request filesystem access:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Data Migration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isMigrating}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {!migrationStatus ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Checking migration status...</p>
          </div>
        ) : !migrationStatus.needsMigration ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <span className="material-symbols-outlined text-6xl text-green-500">check_circle</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Migration Needed
            </h3>
            <p className="text-gray-600 mb-6">
              Your data is already stored using the filesystem. No migration is required.
            </p>
            <button
              onClick={onComplete}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        ) : !migrationStatus.hasFilesystemAccess ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <span className="material-symbols-outlined text-6xl text-yellow-500">folder_open</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              File System Access Required
            </h3>
            <p className="text-gray-600 mb-6">
              LedgerLeaf needs access to your file system to store data as individual YAML files. 
              This allows for better data portability and backup options.
            </p>
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Benefits of File System Storage:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Human-readable YAML files</li>
                  <li>• Easy backup and restore</li>
                  <li>• Data portability</li>
                  <li>• Better organization</li>
                </ul>
              </div>
              <button
                onClick={handleRequestFilesystemAccess}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 w-full"
              >
                Grant File System Access
              </button>
              <button
                onClick={handleSkipMigration}
                className="text-gray-600 hover:text-gray-800 px-6 py-2 w-full"
              >
                Continue with LocalStorage
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">
                Migration Available
              </h3>
              <p className="text-yellow-800">
                We found data in localStorage that can be migrated to the new filesystem storage format.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">What will be migrated:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• All expenses ({migrationStatus.hasLocalStorage ? 'Found data to migrate' : 'No data found'})</li>
                <li>• Configuration settings</li>
                <li>• Export history</li>
              </ul>
            </div>

            {isMigrating ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Migrating data...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
            ) : migrationResult ? (
              <div className="text-center py-8">
                {migrationResult.success ? (
                  <div>
                    <div className="mb-6">
                      <span className="material-symbols-outlined text-6xl text-green-500">check_circle</span>
                    </div>
                    <h3 className="text-lg font-medium text-green-900 mb-2">
                      Migration Successful!
                    </h3>
                    <p className="text-green-800 mb-4">
                      Successfully migrated {migrationResult.expensesMigrated} expenses to filesystem storage.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Next Steps:</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Your data is now stored as individual YAML files</li>
                        <li>• You can find your data in the selected directory</li>
                        <li>• LocalStorage has been cleared</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <span className="material-symbols-outlined text-6xl text-red-500">error</span>
                    </div>
                    <h3 className="text-lg font-medium text-red-900 mb-2">
                      Migration Failed
                    </h3>
                    <p className="text-red-800 mb-4">
                      An error occurred during migration. Please try again.
                    </p>
                    {migrationResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                        <ul className="text-sm text-red-800 space-y-1">
                          {migrationResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleMigration}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Start Migration
                </button>
                <button
                  onClick={handleSkipMigration}
                  className="w-full text-gray-600 hover:text-gray-800 px-6 py-2"
                >
                  Skip Migration
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
