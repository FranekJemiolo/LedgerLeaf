import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main elements are present
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
    await expect(page.locator('text=Local-First Expense Tracker')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation tabs
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Expenses')).toBeVisible();
    await expect(page.locator('text=Calendar')).toBeVisible();
    await expect(page.locator('text=Import')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should navigate to expenses tab', async ({ page }) => {
    await page.goto('/');
    
    // Click on Expenses tab
    await page.click('text=Expenses');
    
    // Check that we're on the expenses page
    await expect(page.locator('text=Add Expense')).toBeVisible();
  });
});
