# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-smoke.spec.ts >> Basic Smoke Tests >> should navigate to settings tab
- Location: tests/basic-smoke.spec.ts:67:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "LedgerLeaf"
Error: strict mode violation: locator('h1') resolved to 2 elements:
    1) <h1 class="text-xl font-bold text-gray-900">LedgerLeaf</h1> aka getByRole('heading', { name: 'LedgerLeaf' })
    2) <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1> aka getByRole('heading', { name: 'Dashboard' })

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e7]:
      - heading "LedgerLeaf" [level=1] [ref=e8]
      - text: Local-First Expense Tracker
  - navigation [ref=e9]:
    - generic [ref=e11]:
      - button "Dashboard" [ref=e12]:
        - img [ref=e13]
        - text: Dashboard
      - button "Expenses" [ref=e18]:
        - img [ref=e19]
        - text: Expenses
      - button "Calendar" [ref=e26]:
        - img [ref=e27]
        - text: Calendar
      - button "Import" [ref=e32]:
        - img [ref=e33]
        - text: Import
      - button "Settings" [ref=e37]:
        - img [ref=e38]
        - text: Settings
  - main [ref=e41]:
    - generic [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - heading "Dashboard" [level=1] [ref=e45]
          - paragraph [ref=e46]: Overview of your recurring expenses and obligations
        - button "Add Expense" [ref=e47]:
          - img [ref=e48]
          - text: Add Expense
      - generic [ref=e51]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - paragraph [ref=e55]: Monthly Recurring
            - paragraph [ref=e56]: $0.00
          - img [ref=e58]
        - generic [ref=e62]:
          - generic [ref=e63]:
            - paragraph [ref=e64]: Upcoming (30 days)
            - paragraph [ref=e65]: "0"
          - img [ref=e67]
        - generic [ref=e73]:
          - generic [ref=e74]:
            - paragraph [ref=e75]: Overdue
            - paragraph [ref=e76]: "0"
          - img [ref=e78]
        - generic [ref=e83]:
          - generic [ref=e84]:
            - paragraph [ref=e85]: Potentially Unused
            - paragraph [ref=e86]: "0"
          - img [ref=e88]
      - generic [ref=e91]:
        - generic [ref=e92]:
          - generic [ref=e93]:
            - heading "Upcoming Payments" [level=2] [ref=e94]
            - paragraph [ref=e95]: Next 30 days
          - generic [ref=e97]:
            - img [ref=e98]
            - paragraph [ref=e103]: No upcoming payments in the next 30 days
        - generic [ref=e104]:
          - generic [ref=e105]:
            - heading "Category Breakdown" [level=2] [ref=e106]
            - paragraph [ref=e107]: Monthly spending by category
          - generic [ref=e109]:
            - img [ref=e110]
            - paragraph [ref=e113]: No categories to display
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Basic Smoke Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |     // Wait for app to load
> 7  |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
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
  35 |     await page.click('text=Expenses');
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