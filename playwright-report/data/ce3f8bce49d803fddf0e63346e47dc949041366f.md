# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Smoke Tests >> should navigate to expenses tab
- Location: tests/smoke.spec.ts:23:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Expenses')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: account_balance_wallet
      - heading "LedgerLeaf" [level=1] [ref=e7]
    - button "add" [ref=e8]:
      - generic [ref=e9]: add
  - main [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]:
            - heading "Monthly Estimated Recurring" [level=3] [ref=e15]
            - generic [ref=e16]: $0.00+4% vs last month
          - generic [ref=e17]:
            - generic [ref=e18]: Utilities$0.00
            - generic [ref=e19]: Subscriptions$0.00
        - generic [ref=e20]:
          - heading "Optimization Score" [level=3] [ref=e21]
          - generic [ref=e23]:
            - text: "82"
            - img [ref=e24]
          - paragraph [ref=e26]: Saving $12/mo could improve your score.
      - generic [ref=e28]:
        - heading "Upcoming Payments" [level=3] [ref=e29]
        - text: Next 7 Days
      - heading "Potentially Unused" [level=3] [ref=e31]
      - generic [ref=e32]:
        - img "Financial overview" [ref=e33]
        - paragraph [ref=e35]: Financial Clarity Achieved.
  - navigation [ref=e36]:
    - button "dashboard Dashboard" [ref=e37]:
      - generic [ref=e38]: dashboard
      - text: Dashboard
    - button "list_alt Inventory" [ref=e39]:
      - generic [ref=e40]: list_alt
      - text: Inventory
    - button "calendar_today Calendar" [ref=e41]:
      - generic [ref=e42]: calendar_today
      - text: Calendar
    - button "auto_awesome Wizard" [ref=e43]:
      - generic [ref=e44]: auto_awesome
      - text: Wizard
    - button "settings Settings" [ref=e45]:
      - generic [ref=e46]: settings
      - text: Settings
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
  9  |     await expect(page.locator('text=Local-First Expense Tracker')).toBeVisible();
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
> 27 |     await page.click('text=Expenses');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  28 |     
  29 |     // Check that we're on the expenses page
  30 |     await expect(page.locator('text=Add Expense')).toBeVisible();
  31 |   });
  32 | });
  33 | 
```