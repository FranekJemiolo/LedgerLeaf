import { test, expect } from '@playwright/test';

test.describe('Settings and Data Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should navigate to settings', async ({ page }) => {
    // Navigate to settings tab
    await page.click('text=Settings');
    
    // Verify settings page elements
    await expect(page.locator('h2')).toContainText('Settings');
    await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-management"]')).toBeVisible();
  });

  test('should update general settings', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Change currency
    await page.selectOption('[data-testid="currency-select"]', 'EUR');
    
    // Change reminder days
    await page.fill('[data-testid="reminder-days"]', '5');
    
    // Change unused days
    await page.fill('[data-testid="unused-days"]', '60');
    
    // Save settings
    await page.click('[data-testid="save-settings"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Settings saved successfully!')).toBeVisible();
    
    // Verify values are saved
    await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('EUR');
    await expect(page.locator('[data-testid="reminder-days"]')).toHaveValue('5');
    await expect(page.locator('[data-testid="unused-days"]')).toHaveValue('60');
  });

  test('should reset settings to defaults', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Change some settings
    await page.selectOption('[data-testid="currency-select"]', 'GBP');
    await page.fill('[data-testid="reminder-days"]', '10');
    
    // Reset to defaults
    await page.click('[data-testid="reset-settings"]');
    
    // Verify defaults are restored
    await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('USD');
    await expect(page.locator('[data-testid="reminder-days"]')).toHaveValue('3');
    await expect(page.locator('[data-testid="unused-days"]')).toHaveValue('45');
  });

  test('should manage notification preferences', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Enable notifications
    await page.click('[data-testid="enable-notifications"]');
    
    // Enable payment reminders
    await page.check('[data-testid="payment-reminders"]');
    
    // Enable usage reminders
    await page.check('[data-testid="usage-reminders"]');
    
    // Save preferences
    await page.click('[data-testid="save-settings"]');
    
    // Verify preferences are saved
    await expect(page.locator('[data-testid="payment-reminders"]')).toBeChecked();
    await expect(page.locator('[data-testid="usage-reminders"]')).toBeChecked();
  });

  test('should export data successfully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-data"]');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/ledgerleaf-backup.*\.csv$/);
  });

  test('should import data successfully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Create test file content
    const csvContent = `name,amount,currency,frequency
Import Test Expense,25.00,USD,monthly
Another Test Expense,50.00,USD,weekly`;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Click import button
    await page.click('[data-testid="import-data"]');
    
    // Verify import success
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
    await expect(page.locator('text=Data imported successfully')).toBeVisible();
  });

  test('should clear all data with confirmation', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click clear data button
    await page.click('[data-testid="clear-data"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete all expenses?')).toBeVisible();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-clear"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="clear-success"]')).toBeVisible();
    await expect(page.locator('text=All data cleared successfully')).toBeVisible();
  });

  test('should cancel data clearing', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click clear data button
    await page.click('[data-testid="clear-data"]');
    
    // Cancel confirmation
    await page.click('[data-testid="cancel-clear"]');
    
    // Should not clear data
    await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();
  });

  test('should display app information', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Verify app information section
    await expect(page.locator('[data-testid="app-info"]')).toBeVisible();
    await expect(page.locator('text=LedgerLeaf - Local-First Expense Tracker')).toBeVisible();
    await expect(page.locator('text=Version: 1.0.0')).toBeVisible();
    await expect(page.locator('text=Data Storage: localStorage')).toBeVisible();
  });

  test('should handle import errors gracefully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Upload invalid file
    const invalidCsv = 'name,amount\nInvalid,not,a,number';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsv)
    });
    
    // Click import button
    await page.click('[data-testid="import-data"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
    await expect(page.locator('text=Failed to import data')).toBeVisible();
  });

  test('should validate settings before saving', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Try to save with invalid reminder days
    await page.fill('[data-testid="reminder-days"]', '-1');
    
    // Try to save
    await page.click('[data-testid="save-settings"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('text=Reminder days must be positive')).toBeVisible();
  });

  test('should persist settings across sessions', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Change currency
    await page.selectOption('[data-testid="currency-select"]', 'JPY');
    
    // Save settings
    await page.click('[data-testid="save-settings"]');
    
    // Refresh page
    await page.reload();
    
    // Navigate back to settings
    await page.click('text=Settings');
    
    // Verify setting is persisted
    await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('JPY');
  });

  test('should show privacy settings', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Verify privacy settings section
    await expect(page.locator('[data-testid="privacy-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="crash-reporting-toggle"]')).toBeVisible();
  });

  test('should toggle privacy preferences', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Enable analytics
    await page.check('[data-testid="analytics-toggle"]');
    
    // Disable crash reporting
    await page.uncheck('[data-testid="crash-reporting-toggle"]');
    
    // Save settings
    await page.click('[data-testid="save-settings"]');
    
    // Verify preferences are saved
    await expect(page.locator('[data-testid="analytics-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="crash-reporting-toggle"]')).not.toBeChecked();
  });

  test('should handle currency changes', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Change currency multiple times
    await page.selectOption('[data-testid="currency-select"]', 'EUR');
    await page.click('[data-testid="save-settings"]');
    
    await page.selectOption('[data-testid="currency-select"]', 'GBP');
    await page.click('[data-testid="save-settings"]');
    
    // Verify final currency
    await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('GBP');
  });

  test('should show expense statistics', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Verify statistics section
    await expect(page.locator('[data-testid="expense-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-expenses"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-expenses"]')).toBeVisible();
  });

  test('should handle large data exports', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-data"]');
    
    // Wait for download and verify it's complete
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/ledgerleaf-backup.*\.csv$/);
  });

  test('should provide feedback for all actions', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Export data
    await page.click('[data-testid="export-data"]');
    
    // Should show success feedback
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Clear feedback after delay
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="success-message"]')).not.toBeVisible();
  });
});
