import { test, expect } from '@playwright/test';

test.describe('Expense CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should create a new expense', async ({ page }) => {
    // Navigate to expenses tab
    await page.click('text=Expenses');
    
    // Click Add Expense button
    await page.click('text=Add Expense');
    
    // Fill out expense form
    await page.fill('[data-testid="expense-name"]', 'Netflix Subscription');
    await page.selectOption('[data-testid="expense-type"]', 'subscription');
    await page.fill('[data-testid="expense-amount"]', '15.99');
    await page.selectOption('[data-testid="expense-currency"]', 'USD');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '1');
    
    // Add category
    await page.click('[data-testid="add-category"]');
    await page.fill('[data-testid="category-input"]', 'Entertainment');
    await page.click('[data-testid="category-save"]');
    
    // Save expense
    await page.click('[data-testid="save-expense"]');
    
    // Verify expense appears in table
    await expect(page.locator('text=Netflix Subscription')).toBeVisible();
    await expect(page.locator('text=$15.99')).toBeVisible();
    await expect(page.locator('text=Entertainment')).toBeVisible();
  });

  test('should edit an existing expense', async ({ page }) => {
    // First create an expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Test Expense');
    await page.fill('[data-testid="expense-amount"]', '50.00');
    await page.click('[data-testid="save-expense"]');
    
    // Edit the expense
    await page.click('[data-testid="edit-expense"]');
    
    // Modify the expense
    await page.fill('[data-testid="expense-name"]', 'Updated Test Expense');
    await page.fill('[data-testid="expense-amount"]', '75.00');
    
    // Save changes
    await page.click('[data-testid="save-expense"]');
    
    // Verify updates
    await expect(page.locator('text=Updated Test Expense')).toBeVisible();
    await expect(page.locator('text=$75.00')).toBeVisible();
  });

  test('should delete an expense', async ({ page }) => {
    // First create an expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Expense to Delete');
    await page.fill('[data-testid="expense-amount"]', '25.00');
    await page.click('[data-testid="save-expense"]');
    
    // Delete the expense
    await page.click('[data-testid="delete-expense"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify expense is removed
    await expect(page.locator('text=Expense to Delete')).not.toBeVisible();
  });

  test('should filter expenses by search term', async ({ page }) => {
    // Create multiple expenses
    await page.click('text=Expenses');
    
    // Create first expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Netflix Subscription');
    await page.fill('[data-testid="expense-amount"]', '15.99');
    await page.click('[data-testid="save-expense"]');
    
    // Create second expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Spotify Premium');
    await page.fill('[data-testid="expense-amount"]', '9.99');
    await page.click('[data-testid="save-expense"]');
    
    // Search for specific expense
    await page.fill('[data-testid="search-input"]', 'Netflix');
    
    // Verify only Netflix appears
    await expect(page.locator('text=Netflix Subscription')).toBeVisible();
    await expect(page.locator('text=Spotify Premium')).not.toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    
    // Verify both expenses appear
    await expect(page.locator('text=Netflix Subscription')).toBeVisible();
    await expect(page.locator('text=Spotify Premium')).toBeVisible();
  });

  test('should filter expenses by status', async ({ page }) => {
    // Create expenses with different statuses
    await page.click('text=Expenses');
    
    // Create active expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Active Service');
    await page.selectOption('[data-testid="expense-status"]', 'active');
    await page.fill('[data-testid="expense-amount"]', '30.00');
    await page.click('[data-testid="save-expense"]');
    
    // Create inactive expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Inactive Service');
    await page.selectOption('[data-testid="expense-status"]', 'inactive');
    await page.fill('[data-testid="expense-amount"]', '20.00');
    await page.click('[data-testid="save-expense"]');
    
    // Filter by active status
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-active"]');
    
    // Verify only active expense appears
    await expect(page.locator('text=Active Service')).toBeVisible();
    await expect(page.locator('text=Inactive Service')).not.toBeVisible();
    
    // Show all expenses
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-all"]');
    
    // Verify both expenses appear
    await expect(page.locator('text=Active Service')).toBeVisible();
    await expect(page.locator('text=Inactive Service')).toBeVisible();
  });

  test('should sort expenses by amount', async ({ page }) => {
    // Create expenses with different amounts
    await page.click('text=Expenses');
    
    // Create high amount expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'High Amount');
    await page.fill('[data-testid="expense-amount"]', '100.00');
    await page.click('[data-testid="save-expense"]');
    
    // Create low amount expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Low Amount');
    await page.fill('[data-testid="expense-amount"]', '10.00');
    await page.click('[data-testid="save-expense"]');
    
    // Sort by amount descending
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('[data-testid="sort-amount-desc"]');
    
    // Verify sorting
    const expenses = await page.locator('[data-testid="expense-row"]').all();
    const firstExpense = await expenses[0].locator('[data-testid="expense-amount"]').textContent();
    const secondExpense = await expenses[1].locator('[data-testid="expense-amount"]').textContent();
    
    // High amount should come first
    expect(firstExpense).toContain('$100.00');
    expect(secondExpense).toContain('$10.00');
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to expenses tab
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    
    // Try to save without required fields
    await page.click('[data-testid="save-expense"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
    
    // Fill required fields
    await page.fill('[data-testid="expense-name"]', 'Valid Expense');
    await page.fill('[data-testid="expense-amount"]', '25.00');
    
    // Now save should work
    await page.click('[data-testid="save-expense"]');
    
    // Verify success
    await expect(page.locator('text=Valid Expense')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="amount-error"]')).not.toBeVisible();
  });

  test('should handle expense categories', async ({ page }) => {
    // Navigate to expenses tab
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    
    // Add multiple categories
    await page.click('[data-testid="add-category"]');
    await page.fill('[data-testid="category-input"]', 'Utilities');
    await page.click('[data-testid="category-save"]');
    
    await page.click('[data-testid="add-category"]');
    await page.fill('[data-testid="category-input"]', 'Bills');
    await page.click('[data-testid="category-save"]');
    
    // Fill expense and save
    await page.fill('[data-testid="expense-name"]', 'Multi-category Expense');
    await page.fill('[data-testid="expense-amount"]', '45.00');
    await page.click('[data-testid="save-expense"]');
    
    // Verify categories are displayed
    await expect(page.locator('text=Multi-category Expense')).toBeVisible();
    await expect(page.locator('text=Utilities')).toBeVisible();
    await expect(page.locator('text=Bills')).toBeVisible();
    
    // Filter by category
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="filter-utilities"]');
    
    // Verify filtering
    await expect(page.locator('text=Multi-category Expense')).toBeVisible();
    
    // Test removing category
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="filter-all"]');
  });

  test('should persist expenses after page refresh', async ({ page }) => {
    // Create an expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Persistent Expense');
    await page.fill('[data-testid="expense-amount"]', '35.00');
    await page.click('[data-testid="save-expense"]');
    
    // Verify expense exists
    await expect(page.locator('text=Persistent Expense')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
    
    // Navigate back to expenses
    await page.click('text=Expenses');
    
    // Verify expense still exists
    await expect(page.locator('text=Persistent Expense')).toBeVisible();
    await expect(page.locator('text=$35.00')).toBeVisible();
  });
});
