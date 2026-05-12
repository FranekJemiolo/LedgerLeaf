import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

test.describe('Import/Export Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should navigate to import wizard', async ({ page }) => {
    // Navigate to import tab
    await page.click('text=Import');
    
    // Verify import wizard elements
    await expect(page.locator('h2')).toContainText('Import Expenses');
    await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
    await expect(page.locator('text=Upload your expense file')).toBeVisible();
  });

  test('should handle CSV file upload', async ({ page }) => {
    // Navigate to import tab
    await page.click('text=Import');
    
    // Create a test CSV file
    const csvContent = `name,amount,currency,frequency
Netflix Subscription,15.99,USD,monthly
Spotify Premium,9.99,USD,monthly`;
    
    // Upload file (simulate file selection)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-expenses.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Should proceed to preview step
    await expect(page.locator('text=Preview & Review')).toBeVisible();
    await expect(page.locator('[data-testid="detected-expenses"]')).toBeVisible();
  });

  test('should detect recurring expenses', async ({ page }) => {
    // Navigate to import tab
    await page.click('text=Import');
    
    // Create CSV with recurring patterns
    const csvContent = `name,amount,currency,frequency
Netflix Subscription,15.99,USD,monthly
Gym Membership,29.99,USD,monthly
Annual Software License,99.00,USD,yearly
Weekly Service,10.00,USD,weekly`;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'recurring-expenses.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Should detect recurring patterns
    await expect(page.locator('[data-testid="recurring-indicator"]')).toBeVisible();
    await expect(page.locator('text=Recurring')).toBeVisible();
    await expect(page.locator('text=Confidence')).toBeVisible();
  });

  test('should allow field mapping', async ({ page }) => {
    // Navigate to import tab
    await page.click('text=Import');
    
    // Upload a file to proceed to mapping step
    const csvContent = `name,amount,currency,frequency
Test Expense,25.00,USD,monthly`;
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Proceed through steps to mapping
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="next-step"]');
    
    // Should show field mapping
    await expect(page.locator('text=Field Mapping')).toBeVisible();
    await expect(page.locator('[data-testid="detected-mappings"]')).toBeVisible();
  });

  test('should complete import process', async ({ page }) => {
    // Navigate to import tab
    await page.click('text=Import');
    
    // Upload and proceed through all steps
    const csvContent = `name,amount,currency,frequency
Final Test Expense,35.00,USD,monthly`;
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'final-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Proceed through steps
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="import-expenses"]');
    
    // Should show completion
    await expect(page.locator('text=Import Successful!')).toBeVisible();
    await expect(page.locator('text=1 expenses have been imported')).toBeVisible();
  });

  test('should navigate to export system', async ({ page }) => {
    // Navigate to settings tab (export is in settings)
    await page.click('text=Settings');
    
    // Verify export system elements
    await expect(page.locator('text=Export Expenses')).toBeVisible();
    await expect(page.locator('[data-testid="export-format"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-range"]')).toBeVisible();
  });

  test('should configure export options', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Select export format
    await page.selectOption('[data-testid="export-format"]', 'xlsx');
    await expect(page.locator('[data-testid="export-format"]')).toHaveValue('xlsx');
    
    // Select date range
    await page.selectOption('[data-testid="date-range"]', 'last30');
    await expect(page.locator('[data-testid="date-range"]')).toHaveValue('last30');
    
    // Toggle field selection
    await page.click('[data-testid="toggle-field-name"]');
    await page.click('[data-testid="toggle-field-amount"]');
    await expect(page.locator('[data-testid="field-name"]')).toBeChecked();
    await expect(page.locator('[data-testid="field-amount"]')).toBeChecked();
  });

  test('should show export preview', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Export preview should be visible
    await expect(page.locator('[data-testid="export-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="records-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
  });

  test('should export to CSV format', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Select CSV format
    await page.selectOption('[data-testid="export-format"]', 'csv');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('should export to Excel format', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Select Excel format
    await page.selectOption('[data-testid="export-format"]', 'xlsx');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('should handle custom date range export', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Select custom date range
    await page.selectOption('[data-testid="date-range"]', 'custom');
    
    // Set custom dates
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-03-31');
    
    // Export should respect date range
    await expect(page.locator('[data-testid="export-preview"]')).toBeVisible();
    await expect(page.locator('text=Custom range')).toBeVisible();
  });

  test('should include inactive expenses option', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Toggle include inactive
    await page.click('[data-testid="include-inactive"]');
    await expect(page.locator('[data-testid="include-inactive"]')).toBeChecked();
    
    // Export preview should update
    await expect(page.locator('[data-testid="export-preview"]')).toBeVisible();
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Try to export without expenses
    await page.click('[data-testid="export-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="export-error"]')).toBeVisible();
    await expect(page.locator('text=No expenses found')).toBeVisible();
  });

  test('should validate export before processing', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Try to export with no fields selected
    await page.uncheck('[data-testid="field-name"]');
    await page.uncheck('[data-testid="field-amount"]');
    
    // Export button should be disabled
    await expect(page.locator('[data-testid="export-button"]')).toBeDisabled();
  });

  test('should show export history', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Export history section should be visible
    await expect(page.locator('[data-testid="export-history"]')).toBeVisible();
    
    // After successful export, should show in history
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="export-button"]');
    
    // Should show recent export
    await expect(page.locator('[data-testid="recent-export"]')).toBeVisible();
  });

  test('should handle large file imports', async ({ page }) => {
    // Navigate to import
    await page.click('text=Import');
    
    // Create large CSV file
    let csvContent = 'name,amount,currency,frequency\n';
    for (let i = 0; i < 100; i++) {
      csvContent += `Expense ${i},${(Math.random() * 100).toFixed(2)},USD,monthly\n`;
    }
    
    // Upload large file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-expenses.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Should handle large file
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();
    await expect(page.locator('text=Processing file...')).toBeVisible();
  });

  test('should provide import feedback', async ({ page }) => {
    // Navigate to import
    await page.click('text=Import');
    
    // Upload invalid file
    const invalidCsv = 'name,amount\nInvalid,not,a,number\nTest,25.00';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsv)
    });
    
    // Should show error feedback
    await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
    await expect(page.locator('text=Import failed')).toBeVisible();
  });

  test('should allow retry on import failure', async ({ page }) => {
    // Navigate to import
    await page.click('text=Import');
    
    // Upload file that will fail
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,amount\nTest,invalid')
    });
    
    // Should show retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('text=Try Again')).toBeVisible();
  });
});
