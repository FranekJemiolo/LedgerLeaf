import { test, expect } from '@playwright/test';

test.describe('App Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('capture main dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
  });

  test('capture inventory list', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.click('text=Inventory');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/inventory.png', fullPage: true });
  });

  test('capture calendar', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.click('text=Calendar');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/calendar.png', fullPage: true });
  });

  test('capture import wizard', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.click('text=Wizard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/import-wizard.png', fullPage: true });
  });

  test('capture settings', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/settings.png', fullPage: true });
  });
});
