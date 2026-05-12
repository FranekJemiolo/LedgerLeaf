# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings and Data Management >> should navigate to settings
- Location: tests/settings.spec.ts:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="general-settings"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="general-settings"]')

```

```yaml
- banner:
  - text: account_balance_wallet
  - heading "LedgerLeaf" [level=1]
  - button "add"
- main:
  - heading "Settings" [level=2]
  - paragraph: Manage your application preferences and data
  - text: payments
  - heading "General Settings" [level=3]
  - text: Default Currency
  - combobox:
    - option "US Dollar ($)" [selected]
    - option "Euro (€)"
    - option "British Pound (£)"
    - option "Japanese Yen (¥)"
    - option "Canadian Dollar (C$)"
    - option "Australian Dollar (A$)"
    - option "Swiss Franc (Fr)"
    - option "Chinese Yuan (¥)"
  - text: Default Payment Reminder Days
  - spinbutton: "3"
  - paragraph: Days before payment due date to send reminders
  - text: Default Unused Service Days
  - spinbutton: "45"
  - paragraph: Days of inactivity before sending usage reminders
  - text: notifications
  - heading "Notifications" [level=3]
  - paragraph: Enable Notifications
  - paragraph: Allow LedgerLeaf to send browser notifications
  - button "Enable"
  - checkbox "Payment Reminders Get notified before payments are due" [checked]
  - paragraph: Payment Reminders
  - paragraph: Get notified before payments are due
  - checkbox "Usage Reminders Get reminded about potentially unused services" [checked]
  - paragraph: Usage Reminders
  - paragraph: Get reminded about potentially unused services
  - text: shield
  - heading "Data Management" [level=3]
  - paragraph: Export Data
  - paragraph: Download all your expenses as a CSV file
  - button "download Export"
  - paragraph: Import Data
  - paragraph: Restore expenses from a backup file
  - text: upload_file Import
  - button "upload_file Import"
  - paragraph: Clear All Data
  - paragraph: Delete all expenses and settings
  - button "delete Clear"
  - text: settings
  - heading "About" [level=3]
  - paragraph:
    - strong: LedgerLeaf
    - text: "- Local-First Expense Tracker"
  - paragraph: "Version: 1.0.0"
  - paragraph: "Data Storage: localStorage"
  - paragraph: "Total Expenses: 0"
  - paragraph: "Active Expenses: 0"
  - button "refresh Reset"
  - button "save Save Settings"
- navigation:
  - button "dashboard Dashboard"
  - button "list_alt Inventory"
  - button "calendar_today Calendar"
  - button "auto_awesome Wizard"
  - button "settings Settings"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Settings and Data Management', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |     // Wait for app to load
  7   |     await expect(page.locator('h1')).toContainText('LedgerLeaf');
  8   |   });
  9   | 
  10  |   test('should navigate to settings', async ({ page }) => {
  11  |     // Navigate to settings tab
  12  |     await page.click('text=Settings');
  13  |     
  14  |     // Verify settings page elements
  15  |     await expect(page.locator('h2')).toContainText('Settings');
> 16  |     await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();
      |                                                                    ^ Error: expect(locator).toBeVisible() failed
  17  |     await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
  18  |     await expect(page.locator('[data-testid="data-management"]')).toBeVisible();
  19  |   });
  20  | 
  21  |   test('should update general settings', async ({ page }) => {
  22  |     // Navigate to settings
  23  |     await page.click('text=Settings');
  24  |     
  25  |     // Change currency
  26  |     await page.selectOption('[data-testid="currency-select"]', 'EUR');
  27  |     
  28  |     // Change reminder days
  29  |     await page.fill('[data-testid="reminder-days"]', '5');
  30  |     
  31  |     // Change unused days
  32  |     await page.fill('[data-testid="unused-days"]', '60');
  33  |     
  34  |     // Save settings
  35  |     await page.click('[data-testid="save-settings"]');
  36  |     
  37  |     // Verify success message
  38  |     await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  39  |     await expect(page.locator('text=Settings saved successfully!')).toBeVisible();
  40  |     
  41  |     // Verify values are saved
  42  |     await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('EUR');
  43  |     await expect(page.locator('[data-testid="reminder-days"]')).toHaveValue('5');
  44  |     await expect(page.locator('[data-testid="unused-days"]')).toHaveValue('60');
  45  |   });
  46  | 
  47  |   test('should reset settings to defaults', async ({ page }) => {
  48  |     // Navigate to settings
  49  |     await page.click('text=Settings');
  50  |     
  51  |     // Change some settings
  52  |     await page.selectOption('[data-testid="currency-select"]', 'GBP');
  53  |     await page.fill('[data-testid="reminder-days"]', '10');
  54  |     
  55  |     // Reset to defaults
  56  |     await page.click('[data-testid="reset-settings"]');
  57  |     
  58  |     // Verify defaults are restored
  59  |     await expect(page.locator('[data-testid="currency-select"]')).toHaveValue('USD');
  60  |     await expect(page.locator('[data-testid="reminder-days"]')).toHaveValue('3');
  61  |     await expect(page.locator('[data-testid="unused-days"]')).toHaveValue('45');
  62  |   });
  63  | 
  64  |   test('should manage notification preferences', async ({ page }) => {
  65  |     // Navigate to settings
  66  |     await page.click('text=Settings');
  67  |     
  68  |     // Enable notifications
  69  |     await page.click('[data-testid="enable-notifications"]');
  70  |     
  71  |     // Enable payment reminders
  72  |     await page.check('[data-testid="payment-reminders"]');
  73  |     
  74  |     // Enable usage reminders
  75  |     await page.check('[data-testid="usage-reminders"]');
  76  |     
  77  |     // Save preferences
  78  |     await page.click('[data-testid="save-settings"]');
  79  |     
  80  |     // Verify preferences are saved
  81  |     await expect(page.locator('[data-testid="payment-reminders"]')).toBeChecked();
  82  |     await expect(page.locator('[data-testid="usage-reminders"]')).toBeChecked();
  83  |   });
  84  | 
  85  |   test('should export data successfully', async ({ page }) => {
  86  |     // Navigate to settings
  87  |     await page.click('text=Settings');
  88  |     
  89  |     // Click export button
  90  |     const downloadPromise = page.waitForEvent('download');
  91  |     await page.click('[data-testid="export-data"]');
  92  |     
  93  |     // Wait for download
  94  |     const download = await downloadPromise;
  95  |     
  96  |     // Verify download
  97  |     expect(download.suggestedFilename()).toMatch(/ledgerleaf-backup.*\.csv$/);
  98  |   });
  99  | 
  100 |   test('should import data successfully', async ({ page }) => {
  101 |     // Navigate to settings
  102 |     await page.click('text=Settings');
  103 |     
  104 |     // Create test file content
  105 |     const csvContent = `name,amount,currency,frequency
  106 | Import Test Expense,25.00,USD,monthly
  107 | Another Test Expense,50.00,USD,weekly`;
  108 |     
  109 |     // Upload file
  110 |     const fileInput = page.locator('input[type="file"]');
  111 |     await fileInput.setInputFiles({
  112 |       name: 'test-import.csv',
  113 |       mimeType: 'text/csv',
  114 |       buffer: Buffer.from(csvContent)
  115 |     });
  116 |     
```