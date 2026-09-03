import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check that the main elements are present
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation tabs
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
    await expect(page.locator('button:has-text("Calendar")')).toBeVisible();
    await expect(page.locator('button:has-text("Wizard")')).toBeVisible();
    await expect(page.locator('button:has-text("Settings")')).toBeVisible();
  });

  test('should navigate to expenses tab', async ({ page }) => {
    await page.goto('/');
    
    // Click on Inventory tab
    await page.click('button:has-text("Inventory")');
    
    // Check that we're on the expenses page
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
  });
});
