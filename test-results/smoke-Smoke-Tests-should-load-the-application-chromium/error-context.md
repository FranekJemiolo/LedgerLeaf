# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Smoke Tests >> should load the application
- Location: tests/smoke.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Local-First Expense Tracker')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Local-First Expense Tracker')

```

```yaml
- banner:
  - text: account_balance_wallet
  - heading "LedgerLeaf" [level=1]
  - button "add"
- main:
  - heading "Monthly Estimated Recurring" [level=3]
  - text: $0.00+4% vs last month Utilities$0.00 Subscriptions$0.00
  - heading "Optimization Score" [level=3]
  - text: "82"
  - img
  - paragraph: Saving $12/mo could improve your score.
  - heading "Upcoming Payments" [level=3]
  - text: Next 7 Days
  - heading "Potentially Unused" [level=3]
  - img "Financial overview"
  - paragraph: Financial Clarity Achieved.
- navigation:
  - button "dashboard Dashboard"
  - button "list_alt Inventory"
  - button "calendar_today Calendar"
  - button "auto_awesome Wizard"
  - button "settings Settings"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Smoke Tests', () => {
  4  |   test('should load the application', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     
  7  |     // Check that the main elements are present
  8  |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
> 9  |     await expect(page.locator('text=Local-First Expense Tracker')).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  10 |   });
  11 | 
  12 |   test('should have working navigation', async ({ page }) => {
  13 |     await page.goto('/');
  14 |     
  15 |     // Test navigation tabs
  16 |     await expect(page.locator('text=Dashboard')).toBeVisible();
  17 |     await expect(page.locator('text=Expenses')).toBeVisible();
  18 |     await expect(page.locator('text=Calendar')).toBeVisible();
  19 |     await expect(page.locator('text=Import')).toBeVisible();
  20 |     await expect(page.locator('text=Settings')).toBeVisible();
  21 |   });
  22 | 
  23 |   test('should navigate to expenses tab', async ({ page }) => {
  24 |     await page.goto('/');
  25 |     
  26 |     // Click on Expenses tab
  27 |     await page.click('text=Expenses');
  28 |     
  29 |     // Check that we're on the expenses page
  30 |     await expect(page.locator('text=Add Expense')).toBeVisible();
  31 |   });
  32 | });
  33 | 
```