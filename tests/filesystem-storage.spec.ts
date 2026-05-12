import { test, expect } from '@playwright/test';
import { Expense } from '../src/types';
import { filesystemStorageService } from '../src/storage/filesystem-storage';

test.describe('Filesystem Storage', () => {
  test.beforeEach(async () => {
    // Mock File System Access API for testing
    await mockFileSystemAccess();
    
    // Initialize filesystem storage for each test
    await filesystemStorageService.initialize();
  });

  test('should initialize filesystem storage', async () => {
    await expect(filesystemStorageService.initialize()).resolves.not.toThrow();
  });

  test('should create and retrieve expense', async () => {
    const testExpense = {
      name: 'Test Expense',
      type: 'subscription' as const,
      status: 'active' as const,
      cost: { amount: 99.99, currency: 'USD' },
      billing: { frequency: 'monthly' as const, interval: 1, due_day: 15 },
      category: ['test'],
      reminders: { enabled: true, days_before: 3 },
      usage_tracking: { enabled: true, remind_after_days_unused: 45 },
      notes: 'Test note',
      tags: ['test']
    };

    const createdExpense = await filesystemStorageService.createExpense(testExpense);
    
    expect(createdExpense.id).toBeTruthy();
    expect(createdExpense.name).toBe(testExpense.name);
    expect(createdExpense.cost.amount).toBe(testExpense.cost.amount);

    const retrievedExpense = await filesystemStorageService.loadExpense(createdExpense.id);
    expect(retrievedExpense).toBeTruthy();
    expect(retrievedExpense?.id).toBe(createdExpense.id);
    expect(retrievedExpense?.name).toBe(testExpense.name);
  });

  test('should update expense', async () => {
    const testExpense: Omit<Expense, 'id' | 'metadata'> = {
      name: 'Update Test',
      type: 'service',
      status: 'active',
      cost: { amount: 50.00, currency: 'EUR' },
      billing: { frequency: 'weekly', interval: 1, due_day: 1 },
      category: ['test'],
      reminders: { enabled: false, days_before: 7 },
      usage_tracking: { enabled: false, remind_after_days_unused: 60 },
      notes: 'Original note',
      tags: ['original']
    };

    const createdExpense = await filesystemStorageService.createExpense(testExpense);
    
    // Update expense
    const updatedExpense = {
      ...createdExpense,
      name: 'Updated Expense',
      cost: { ...createdExpense.cost, amount: 75.00 },
      notes: 'Updated note'
    };

    await filesystemStorageService.saveExpense(updatedExpense);

    const retrievedExpense = await filesystemStorageService.loadExpense(createdExpense.id);
    expect(retrievedExpense?.name).toBe('Updated Expense');
    expect(retrievedExpense?.cost.amount).toBe(75.00);
    expect(retrievedExpense?.notes).toBe('Updated note');
    expect(retrievedExpense?.metadata.updated_at).not.toBe(createdExpense.metadata.updated_at);
  });

  test('should delete expense', async () => {
    const testExpense: Omit<Expense, 'id' | 'metadata'> = {
      name: 'Delete Test',
      type: 'other',
      status: 'active',
      cost: { amount: 25.00, currency: 'USD' },
      billing: { frequency: 'monthly', interval: 1, due_day: 1 },
      category: ['test'],
      reminders: { enabled: true, days_before: 3 },
      usage_tracking: { enabled: true, remind_after_days_unused: 45 },
      notes: 'To be deleted',
      tags: ['delete']
    };

    const createdExpense = await filesystemStorageService.createExpense(testExpense);
    
    // Verify expense exists
    let retrievedExpense = await filesystemStorageService.loadExpense(createdExpense.id);
    expect(retrievedExpense).toBeTruthy();

    // Delete expense
    await filesystemStorageService.deleteExpense(createdExpense.id);

    // Verify expense is deleted
    retrievedExpense = await filesystemStorageService.loadExpense(createdExpense.id);
    expect(retrievedExpense).toBeNull();
  });

  test('should load all expenses', async () => {
    const expenses = [
      {
        id: 'test-1',
        name: 'Expense 1',
        type: 'subscription' as const,
        status: 'active' as const,
        cost: { amount: 10.00, currency: 'USD' },
        billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
        category: ['test'],
        reminders: { enabled: true, days_before: 3 },
        usage_tracking: { enabled: true, remind_after_days_unused: 45 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Test 1',
        tags: ['test1']
      },
      {
        id: 'test-2',
        name: 'Expense 2',
        type: 'service' as const,
        status: 'active' as const,
        cost: { amount: 20.00, currency: 'USD' },
        billing: { frequency: 'weekly' as const, interval: 1, due_day: 2 },
        category: ['test'],
        reminders: { enabled: false, days_before: 7 },
        usage_tracking: { enabled: false, remind_after_days_unused: 60 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Test 2',
        tags: ['test2']
      },
      {
        id: 'test-3',
        name: 'Expense 3',
        type: 'utility' as const,
        status: 'inactive' as const,
        cost: { amount: 30.00, currency: 'USD' },
        billing: { frequency: 'yearly' as const, interval: 1, due_day: 3 },
        category: ['test'],
        reminders: { enabled: true, days_before: 14 },
        usage_tracking: { enabled: true, remind_after_days_unused: 90 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Test 3',
        tags: ['test3']
      }
    ];

    // Create multiple expenses
    for (const expense of expenses) {
      await filesystemStorageService.createExpense(expense);
    }

    // Load all expenses
    const allExpenses = await filesystemStorageService.loadAllExpenses();
    expect(allExpenses).toHaveLength(3);

    // Verify all expenses are present
    const expenseNames = allExpenses.map(e => e.name);
    expect(expenseNames).toContain('Expense 1');
    expect(expenseNames).toContain('Expense 2');
    expect(expenseNames).toContain('Expense 3');
  });

  test('should validate expense data', async () => {
    const invalidExpense = {
      name: 'Error Test',
      type: 'subscription' as const,
      status: 'active' as const,
      cost: { amount: -10, currency: 'USD' }, // Invalid: negative amount
      billing: { frequency: 'monthly' as const, interval: 1, due_day: 32 }, // Invalid: day 32
      category: ['test'],
      reminders: { enabled: true, days_before: 3 },
      usage_tracking: { enabled: true, remind_after_days_unused: 45 },
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      notes: 'Invalid test',
      tags: ['error']
    };

    await expect(filesystemStorageService.createExpense(invalidExpense)).rejects.toThrow();
  });

  test('should handle config operations', async () => {
    const config = await filesystemStorageService.loadConfig();
    expect(config.currency).toBe('USD');
    expect(config.default_reminder_days).toBe(3);
    expect(config.default_unused_days).toBe(45);

    // Update config
    const updatedConfig = {
      ...config,
      currency: 'EUR',
      default_reminder_days: 7,
      default_unused_days: 60
    };

    await filesystemStorageService.saveConfig(updatedConfig);

    const retrievedConfig = await filesystemStorageService.loadConfig();
    expect(retrievedConfig.currency).toBe('EUR');
    expect(retrievedConfig.default_reminder_days).toBe(7);
    expect(retrievedConfig.default_unused_days).toBe(60);
  });

  test('should export to CSV', async () => {
    const testExpenses = [
      {
        id: 'export-1',
        name: 'Export Test 1',
        type: 'subscription' as const,
        status: 'active' as const,
        cost: { amount: 15.00, currency: 'USD' },
        billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
        category: ['export'],
        reminders: { enabled: true, days_before: 3 },
        usage_tracking: { enabled: true, remind_after_days_unused: 45 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Export test 1',
        tags: ['export1']
      },
      {
        id: 'export-2',
        name: 'Export Test 2',
        type: 'service' as const,
        status: 'active' as const,
        cost: { amount: 25.50, currency: 'USD' },
        billing: { frequency: 'weekly' as const, interval: 1, due_day: 2 },
        category: ['export'],
        reminders: { enabled: false, days_before: 7 },
        usage_tracking: { enabled: false, remind_after_days_unused: 60 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Export test 2',
        tags: ['export2']
      }
    ];

    // Create test expenses
    for (const expense of testExpenses) {
      await filesystemStorageService.createExpense(expense);
    }

    // Export to CSV
    const csvContent = await filesystemStorageService.exportToCSV(testExpenses);

    // Verify CSV content
    expect(csvContent).toContain('id,name,type,status');
    expect(csvContent).toContain('Export Test 1');
    expect(csvContent).toContain('Export Test 2');
    expect(csvContent).toContain('15.00');
    expect(csvContent).toContain('25.50');
  });

  test('should import expenses', async () => {
    const importExpenses = [
      {
        name: 'Import Test 1',
        type: 'subscription' as const,
        status: 'active' as const,
        cost: { amount: 35.00, currency: 'GBP' },
        billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
        category: ['import'],
        reminders: { enabled: true, days_before: 3 },
        usage_tracking: { enabled: true, remind_after_days_unused: 45 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Import test 1',
        tags: ['import1']
      },
      {
        name: 'Import Test 2',
        type: 'service' as const,
        status: 'active' as const,
        cost: { amount: 45.75, currency: 'GBP' },
        billing: { frequency: 'weekly' as const, interval: 1, due_day: 2 },
        category: ['import'],
        reminders: { enabled: false, days_before: 7 },
        usage_tracking: { enabled: false, remind_after_days_unused: 60 },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        notes: 'Import test 2',
        tags: ['import2']
      }
    ] as Expense[];

    // Import expenses
    const importResult = await filesystemStorageService.importExpenses(importExpenses);

    expect(importResult.imported).toBe(2);
    expect(importResult.errors).toHaveLength(0);

    // Verify imported expenses
    const allExpenses = await filesystemStorageService.loadAllExpenses();
    expect(allExpenses).toHaveLength(2);

    const expenseNames = allExpenses.map(e => e.name);
    expect(expenseNames).toContain('Import Test 1');
    expect(expenseNames).toContain('Import Test 2');
  });

  test('should handle file system errors gracefully', async () => {
    // Mock file system error
    await mockFileSystemError();

    await expect(filesystemStorageService.loadAllExpenses()).rejects.toThrow();
    await expect(filesystemStorageService.createExpense({
      id: 'error-1',
      name: 'Error Test',
      type: 'subscription' as const,
      status: 'active' as const,
      cost: { amount: 10.00, currency: 'USD' },
      billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
      category: ['test'],
      reminders: { enabled: true, days_before: 3 },
      usage_tracking: { enabled: true, remind_after_days_unused: 45 },
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      notes: 'Error test',
      tags: ['error']
    })).rejects.toThrow();
  });
});

// Mock functions for testing
async function mockFileSystemAccess() {
  // This would be implemented with actual mocking framework
  // For now, this is a placeholder
  console.log('Mocking File System Access API for tests');
}

async function mockFileSystemError() {
  // This would be implemented with actual mocking framework
  // For now, this is a placeholder
  console.log('Mocking File System Access API error for tests');
}
