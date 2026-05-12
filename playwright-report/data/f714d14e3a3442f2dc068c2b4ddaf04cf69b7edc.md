# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: storage.spec.ts >> Storage Service >> should initialize storage service successfully
- Location: tests/storage.spec.ts:4:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:1420/
Call log:
  - navigating to "http://localhost:1420/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Storage Service', () => {
  4  |   test('should initialize storage service successfully', async ({ page }) => {
  5  |     // Navigate to the app
> 6  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:1420/
  7  |     
  8  |     // Wait for the app to load
  9  |     await page.waitForLoadState('networkidle');
  10 |     
  11 |     // Check that the app loads without storage errors
  12 |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  13 |     
  14 |     // Check that we can navigate to expenses (which tests storage initialization)
  15 |     await page.click('text=Expenses');
  16 |     await expect(page.locator('text=No expenses yet')).toBeVisible();
  17 |   });
  18 | 
  19 |   test('should persist expenses across page reloads', async ({ page }) => {
  20 |     // Create an expense
  21 |     await page.goto('/');
  22 |     await page.waitForLoadState('networkidle');
  23 |     await page.click('text=Expenses');
  24 |     await page.click('button:has-text("Add Expense")');
  25 |     await page.fill('input[placeholder="Netflix, Gym membership, etc."]', 'Persistence Test');
  26 |     await page.fill('input[placeholder="0.00"]', '12.99');
  27 |     await page.click('button:has-text("Create")');
  28 |     await expect(page.locator('text=Create Expense')).not.toBeVisible();
  29 |     
  30 |     // Reload the page
  31 |     await page.reload();
  32 |     await page.waitForLoadState('networkidle');
  33 |     
  34 |     // Navigate to expenses and check the expense is still there
  35 |     await page.click('text=Expenses');
  36 |     await expect(page.locator('text=Persistence Test')).toBeVisible();
  37 |   });
  38 | 
  39 |   test('should handle storage errors gracefully', async ({ page }) => {
  40 |     // This test would simulate storage errors
  41 |     // For now, we'll just verify the app loads
  42 |     await page.goto('/');
  43 |     await page.waitForLoadState('networkidle');
  44 |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  45 |   });
  46 | });
  47 | 
```