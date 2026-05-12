# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard Functionality >> should handle empty dashboard state
- Location: tests/dashboard.spec.ts:99:3

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
  3   | test.describe('Dashboard Functionality', () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto('/');
      |                ^ Error: page.goto: NS_ERROR_CONNECTION_REFUSED
  6   |     await page.waitForLoadState('networkidle');
  7   |   });
  8   | 
  9   |   test('should display dashboard with correct metrics', async ({ page }) => {
  10  |     // Create some test expenses first
  11  |     await page.click('text=Expenses');
  12  |     
  13  |     // Create a monthly subscription
  14  |     await page.click('button:has-text("Add Expense")');
  15  |     await page.fill('input[placeholder="Netflix, Gym membership, etc."]', 'Netflix');
  16  |     await page.fill('input[placeholder="0.00"]', '15.99');
  17  |     await page.selectOption('select[name="frequency"]', 'monthly');
  18  |     await page.fill('input[placeholder="Add a category..."]', 'streaming');
  19  |     await page.click('button:has-text("Add")');
  20  |     await page.click('button:has-text("Create")');
  21  |     await expect(page.locator('text=Create Expense')).not.toBeVisible();
  22  |     
  23  |     // Create another monthly expense
  24  |     await page.click('button:has-text("Add Expense")');
  25  |     await page.fill('input[placeholder="Netflix, Gym membership, etc."]', 'Gym');
  26  |     await page.fill('input[placeholder="0.00"]', '29.99');
  27  |     await page.selectOption('select[name="frequency"]', 'monthly');
  28  |     await page.fill('input[placeholder="Add a category..."]', 'fitness');
  29  |     await page.click('button:has-text("Add")');
  30  |     await page.click('button:has-text("Create")');
  31  |     await expect(page.locator('text=Create Expense')).not.toBeVisible();
  32  |     
  33  |     // Navigate to dashboard
  34  |     await page.click('text=Dashboard');
  35  |     
  36  |     // Check that metrics are displayed
  37  |     await expect(page.locator('text=Monthly Recurring')).toBeVisible();
  38  |     await expect(page.locator('text=$45.98')).toBeVisible(); // 15.99 + 29.99
  39  |     await expect(page.locator('text=Upcoming (30 days)')).toBeVisible();
  40  |     await expect(page.locator('text=2')).toBeVisible(); // Two expenses
  41  |   });
  42  | 
  43  |   test('should display upcoming payments section', async ({ page }) => {
  44  |     // Create a test expense
  45  |     await page.click('text=Expenses');
  46  |     await page.click('button:has-text("Add Expense")');
  47  |     await page.fill('input[placeholder="Netflix, Gym membership, etc."]', 'Upcoming Test');
  48  |     await page.fill('input[placeholder="0.00"]', '25.00');
  49  |     await page.selectOption('select[name="frequency"]', 'monthly');
  50  |     await page.fill('input[placeholder="15"]', '20'); // Due on 20th
  51  |     await page.click('button:has-text("Create")');
  52  |     await expect(page.locator('text=Create Expense')).not.toBeVisible();
  53  |     
  54  |     // Navigate to dashboard
  55  |     await page.click('text=Dashboard');
  56  |     
  57  |     // Check upcoming payments section
  58  |     await expect(page.locator('text=Upcoming Payments')).toBeVisible();
  59  |     await expect(page.locator('text=Next 30 days')).toBeVisible();
  60  |     
  61  |     // The expense should appear in upcoming payments
  62  |     await expect(page.locator('text=Upcoming Test')).toBeVisible();
  63  |     await expect(page.locator('text=$25.00')).toBeVisible();
  64  |   });
  65  | 
  66  |   test('should display category breakdown', async ({ page }) => {
  67  |     // Create expenses in different categories
  68  |     const expenses = [
  69  |       { name: 'Netflix', amount: '15.99', category: 'streaming' },
  70  |       { name: 'Spotify', amount: '9.99', category: 'music' },
  71  |       { name: 'Gym', amount: '29.99', category: 'fitness' }
  72  |     ];
  73  |     
  74  |     await page.click('text=Expenses');
  75  |     
  76  |     for (const expense of expenses) {
  77  |       await page.click('button:has-text("Add Expense")');
  78  |       await page.fill('input[placeholder="Netflix, Gym membership, etc."]', expense.name);
  79  |       await page.fill('input[placeholder="0.00"]', expense.amount);
  80  |       await page.fill('input[placeholder="Add a category..."]', expense.category);
  81  |       await page.click('button:has-text("Add")');
  82  |       await page.click('button:has-text("Create")');
  83  |       await expect(page.locator('text=Create Expense')).not.toBeVisible();
  84  |     }
  85  |     
  86  |     // Navigate to dashboard
  87  |     await page.click('text=Dashboard');
  88  |     
  89  |     // Check category breakdown
  90  |     await expect(page.locator('text=Category Breakdown')).toBeVisible();
  91  |     await expect(page.locator('text=Monthly spending by category')).toBeVisible();
  92  |     
  93  |     // Categories should be displayed
  94  |     await expect(page.locator('text=streaming')).toBeVisible();
  95  |     await expect(page.locator('text=music')).toBeVisible();
  96  |     await expect(page.locator('text=fitness')).toBeVisible();
  97  |   });
  98  | 
  99  |   test('should handle empty dashboard state', async ({ page }) => {
  100 |     // Navigate to dashboard without creating any expenses
  101 |     await expect(page.locator('text=Monthly Recurring')).toBeVisible();
  102 |     await expect(page.locator('text=$0.00')).toBeVisible();
  103 |     await expect(page.locator('text=Upcoming (30 days)')).toBeVisible();
  104 |     await expect(page.locator('text=0')).toBeVisible();
  105 |     await expect(page.locator('text=Overdue')).toBeVisible();
```