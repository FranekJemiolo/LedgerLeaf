# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> LedgerLeaf Application >> should delete an expense
- Location: tests/app.spec.ts:142:3

# Error details

```
Error: page.goto: NS_ERROR_CONNECTION_REFUSED
Call log:
  - navigating to "http://localhost:1420/", waiting until "load"

```

# Page snapshot

```yaml
- article "Looks like there’s a problem with this site" [ref=e3]:
  - img "Illustration of a fox looking at disconnected network cables." [ref=e5]
  - generic [ref=e7]:
    - heading "Looks like there’s a problem with this site" [level=1] [ref=e8]
    - paragraph [ref=e9]:
      - text: Nightly can’t connect to the server at
      - strong [ref=e10]: localhost:1420
    - generic [ref=e11]:
      - heading "What can you do about it?" [level=3] [ref=e12]
      - paragraph [ref=e13]: Try connecting on a different device. Check your modem or router. Disconnect and reconnect to Wi-Fi.
    - button "Try Again" [ref=e16]:
      - generic [ref=e18]:
        - generic: Try Again
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('LedgerLeaf Application', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Navigate to the app
> 6   |     await page.goto('/');
      |                ^ Error: page.goto: NS_ERROR_CONNECTION_REFUSED
  7   |     
  8   |     // Wait for the app to load
  9   |     await page.waitForLoadState('networkidle');
  10  |     
  11  |     // Wait for the main content to be visible
  12  |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  13  |   });
  14  | 
  15  |   test('should load the application successfully', async ({ page }) => {
  16  |     // Check that the header is present
  17  |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  18  |     await expect(page.locator('text=Local-First Expense Tracker')).toBeVisible();
  19  |     
  20  |     // Check that navigation tabs are present
  21  |     await expect(page.locator('text=Dashboard')).toBeVisible();
  22  |     await expect(page.locator('text=Expenses')).toBeVisible();
  23  |     await expect(page.locator('text=Calendar')).toBeVisible();
  24  |     await expect(page.locator('text=Import')).toBeVisible();
  25  |     await expect(page.locator('text=Settings')).toBeVisible();
  26  |     
  27  |     // Check that Dashboard is the active tab
  28  |     await expect(page.locator('button[aria-selected="true"]')).toContainText('Dashboard');
  29  |   });
  30  | 
  31  |   test('should navigate between tabs', async ({ page }) => {
  32  |     // Navigate to Expenses tab
  33  |     await page.click('text=Expenses');
  34  |     await expect(page.locator('button[aria-selected="true"]')).toContainText('Expenses');
  35  |     
  36  |     // Navigate to Calendar tab
  37  |     await page.click('text=Calendar');
  38  |     await expect(page.locator('button[aria-selected="true"]')).toContainText('Calendar');
  39  |     await expect(page.locator('text=Calendar view coming soon')).toBeVisible();
  40  |     
  41  |     // Navigate to Import tab
  42  |     await page.click('text=Import');
  43  |     await expect(page.locator('button[aria-selected="true"]')).toContainText('Import');
  44  |     await expect(page.locator('text=Import and export features coming soon')).toBeVisible();
  45  |     
  46  |     // Navigate to Settings tab
  47  |     await page.click('text=Settings');
  48  |     await expect(page.locator('button[aria-selected="true"]')).toContainText('Settings');
  49  |     await expect(page.locator('text=Settings panel coming soon')).toBeVisible();
  50  |     
  51  |     // Navigate back to Dashboard
  52  |     await page.click('text=Dashboard');
  53  |     await expect(page.locator('button[aria-selected="true"]')).toContainText('Dashboard');
  54  |   });
  55  | 
  56  |   test('should display dashboard with summary cards', async ({ page }) => {
  57  |     // Check dashboard header
  58  |     await expect(page.locator('h1')).toContainText('Dashboard');
  59  |     await expect(page.locator('text=Overview of your recurring expenses and obligations')).toBeVisible();
  60  |     
  61  |     // Check summary cards
  62  |     await expect(page.locator('text=Monthly Recurring')).toBeVisible();
  63  |     await expect(page.locator('text=Upcoming (30 days)')).toBeVisible();
  64  |     await expect(page.locator('text=Overdue')).toBeVisible();
  65  |     await expect(page.locator('text=Potentially Unused')).toBeVisible();
  66  |     
  67  |     // Check Add Expense button
  68  |     await expect(page.locator('button:has-text("Add Expense")')).toBeVisible();
  69  |   });
  70  | 
  71  |   test('should open and use expense creation form', async ({ page }) => {
  72  |     // Navigate to Expenses tab
  73  |     await page.click('text=Expenses');
  74  |     
  75  |     // Click Add Expense button
  76  |     await page.click('button:has-text("Add Expense")');
  77  |     
  78  |     // Check that the expense editor modal is open
  79  |     await expect(page.locator('text=Create Expense')).toBeVisible();
  80  |     
  81  |     // Fill in the expense form
  82  |     await page.fill('input[placeholder="Netflix, Gym membership, etc."]', 'Test Subscription');
  83  |     await page.selectOption('select[name="type"]', 'subscription');
  84  |     await page.fill('input[placeholder="0.00"]', '15.99');
  85  |     await page.selectOption('select[name="currency"]', 'USD');
  86  |     await page.selectOption('select[name="frequency"]', 'monthly');
  87  |     await page.fill('input[placeholder="Add a category..."]', 'entertainment');
  88  |     await page.click('button:has-text("Add")');
  89  |     
  90  |     // Add tags
  91  |     await page.fill('input[placeholder="Add a tag..."]', 'test');
  92  |     await page.click('button:has-text("Add")');
  93  |     
  94  |     // Enable reminders
  95  |     await page.check('input#reminders-enabled');
  96  |     await page.fill('input[placeholder="3"]', '7');
  97  |     
  98  |     // Enable usage tracking
  99  |     await page.check('input#usage-tracking-enabled');
  100 |     await page.fill('input[placeholder="45"]', '30');
  101 |     
  102 |     // Add notes
  103 |     await page.fill('textarea[placeholder="Additional notes about this expense..."]', 'Test subscription for e2e testing');
  104 |     
  105 |     // Save the expense
  106 |     await page.click('button:has-text("Create")');
```