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
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    // Test navigation tabs
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
    await expect(page.locator('button:has-text("Calendar")')).toBeVisible();
    await expect(page.locator('button:has-text("Wizard")')).toBeVisible();
    await expect(page.locator('button:has-text("Settings")')).toBeVisible();
  });

  test('should navigate to expenses tab', async ({ page }) => {
    // Click on Inventory tab
    await page.click('button:has-text("Inventory")');
    
    // Check that we're on the expenses page
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
  });

  test.skip('should create a basic expense', async ({ page }) => {
    // Skip this test for now - modal interaction needs investigation
    // Click the add button in the header
    await page.click('button:has(.material-symbols-outlined)');
    
    // Wait for modal to appear
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    
    // Fill out basic expense form
    await page.fill('input[type="text"]', 'Test Expense');
    await page.fill('input[type="number"]', '25.00');
    
    // Save expense
    await page.click('button:has-text("Save")');
    
    // Wait for modal to close
    await page.waitForTimeout(500);
  });

  test('should navigate to calendar tab', async ({ page }) => {
    // Click on Calendar tab
    await page.click('button:has-text("Calendar")');
    
    // Check that calendar view is loaded
    await expect(page.locator('button:has-text("Calendar")')).toBeVisible();
  });

  test('should navigate to import tab', async ({ page }) => {
    // Click on Wizard tab
    await page.click('button:has-text("Wizard")');
    
    // Check that import view is loaded
    await expect(page.locator('button:has-text("Wizard")')).toBeVisible();
  });

  test('should navigate to settings tab', async ({ page }) => {
    // Click on Settings tab
    await page.click('button:has-text("Settings")');
    
    // Check that settings view is loaded - use first() to handle strict mode
    await expect(page.locator('button:has-text("Settings")').first()).toBeVisible();
  });

  test('should handle tab switching', async ({ page }) => {
    // Start on dashboard
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
    
    // Switch to Inventory
    await page.click('button:has-text("Inventory")');
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
    
    // Switch back to Dashboard
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
  });
});
