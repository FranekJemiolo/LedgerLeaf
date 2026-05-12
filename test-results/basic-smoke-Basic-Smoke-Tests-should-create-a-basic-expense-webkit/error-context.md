# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-smoke.spec.ts >> Basic Smoke Tests >> should create a basic expense
- Location: tests/basic-smoke.spec.ts:33:3

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
  3  | test.describe('Basic Smoke Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |     // Wait for app to load
  7  |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  8  |   });
  9  | 
  10 |   test('should load the application', async ({ page }) => {
  11 |     // Check that the main elements are present
  12 |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  13 |     await expect(page.locator('text=Local-First Expense Tracker')).toBeVisible();
  14 |   });
  15 | 
  16 |   test('should have working navigation', async ({ page }) => {
  17 |     // Test navigation tabs
  18 |     await expect(page.locator('text=Dashboard')).toBeVisible();
  19 |     await expect(page.locator('text=Expenses')).toBeVisible();
  20 |     await expect(page.locator('text=Calendar')).toBeVisible();
  21 |     await expect(page.locator('text=Import')).toBeVisible();
  22 |     await expect(page.locator('text=Settings')).toBeVisible();
  23 |   });
  24 | 
  25 |   test('should navigate to expenses tab', async ({ page }) => {
  26 |     // Click on Expenses tab
  27 |     await page.click('text=Expenses');
  28 |     
  29 |     // Check that we're on the expenses page
  30 |     await expect(page.locator('text=Add Expense')).toBeVisible();
  31 |   });
  32 | 
  33 |   test('should create a basic expense', async ({ page }) => {
  34 |     // Navigate to expenses tab
> 35 |     await page.click('text=Expenses');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  36 |     
  37 |     // Click Add Expense button
  38 |     await page.click('text=Add Expense');
  39 |     
  40 |     // Fill out basic expense form
  41 |     await page.fill('input[placeholder*="Expense name"]', 'Test Expense');
  42 |     await page.fill('input[placeholder*="Amount"]', '25.00');
  43 |     
  44 |     // Save expense
  45 |     await page.click('button:has-text("Save")');
  46 |     
  47 |     // Wait for modal to close
  48 |     await expect(page.locator('button:has-text("Save")')).not.toBeVisible({ timeout: 5000 });
  49 |   });
  50 | 
  51 |   test('should navigate to calendar tab', async ({ page }) => {
  52 |     // Click on Calendar tab
  53 |     await page.click('text=Calendar');
  54 |     
  55 |     // Check that calendar view is loaded
  56 |     await expect(page.locator('h2:has-text("Calendar")')).toBeVisible();
  57 |   });
  58 | 
  59 |   test('should navigate to import tab', async ({ page }) => {
  60 |     // Click on Import tab
  61 |     await page.click('text=Import');
  62 |     
  63 |     // Check that import view is loaded
  64 |     await expect(page.locator('h2:has-text("Import Expenses")')).toBeVisible();
  65 |   });
  66 | 
  67 |   test('should navigate to settings tab', async ({ page }) => {
  68 |     // Click on Settings tab
  69 |     await page.click('text=Settings');
  70 |     
  71 |     // Check that settings view is loaded
  72 |     await expect(page.locator('h2:has-text("Settings")')).toBeVisible();
  73 |   });
  74 | 
  75 |   test('should handle tab switching', async ({ page }) => {
  76 |     // Start on dashboard
  77 |     await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();
  78 |     
  79 |     // Switch to Expenses
  80 |     await page.click('text=Expenses');
  81 |     await expect(page.locator('h2:has-text("Dashboard")')).not.toBeVisible();
  82 |     await expect(page.locator('text=Add Expense')).toBeVisible();
  83 |     
  84 |     // Switch back to Dashboard
  85 |     await page.click('text=Dashboard');
  86 |     await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();
  87 |     await expect(page.locator('text=Add Expense')).not.toBeVisible();
  88 |   });
  89 | });
  90 | 
```