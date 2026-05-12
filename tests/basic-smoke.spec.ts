import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should load the application', async ({ page }) => {
    // Check that the main elements are present
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
    await expect(page.locator('text=Local-First Expense Tracker')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    // Test navigation tabs
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Expenses')).toBeVisible();
    await expect(page.locator('text=Calendar')).toBeVisible();
    await expect(page.locator('text=Import')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should navigate to expenses tab', async ({ page }) => {
    // Click on Expenses tab
    await page.click('text=Expenses');
    
    // Check that we're on the expenses page
    await expect(page.locator('text=Add Expense')).toBeVisible();
  });

  test('should create a basic expense', async ({ page }) => {
    // Navigate to expenses tab
    await page.click('text=Expenses');
    
    // Click Add Expense button
    await page.click('text=Add Expense');
    
    // Fill out basic expense form
    await page.fill('input[placeholder*="Expense name"]', 'Test Expense');
    await page.fill('input[placeholder*="Amount"]', '25.00');
    
    // Save expense
    await page.click('button:has-text("Save")');
    
    // Wait for modal to close
    await expect(page.locator('button:has-text("Save")')).not.toBeVisible({ timeout: 5000 });
  });

  test('should navigate to calendar tab', async ({ page }) => {
    // Click on Calendar tab
    await page.click('text=Calendar');
    
    // Check that calendar view is loaded
    await expect(page.locator('h2:has-text("Calendar")')).toBeVisible();
  });

  test('should navigate to import tab', async ({ page }) => {
    // Click on Import tab
    await page.click('text=Import');
    
    // Check that import view is loaded
    await expect(page.locator('h2:has-text("Import Expenses")')).toBeVisible();
  });

  test('should navigate to settings tab', async ({ page }) => {
    // Click on Settings tab
    await page.click('text=Settings');
    
    // Check that settings view is loaded
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();
  });

  test('should handle tab switching', async ({ page }) => {
    // Start on dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();
    
    // Switch to Expenses
    await page.click('text=Expenses');
    await expect(page.locator('h2:has-text("Dashboard")')).not.toBeVisible();
    await expect(page.locator('text=Add Expense')).toBeVisible();
    
    // Switch back to Dashboard
    await page.click('text=Dashboard');
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Add Expense')).not.toBeVisible();
  });
});
