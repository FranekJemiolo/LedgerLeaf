import { test, expect } from '@playwright/test';

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should request notification permission', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click enable notifications
    await page.click('[data-testid="enable-notifications"]');
    
    // Should show permission dialog or success message
    // Note: In headless mode, we might not see the actual browser permission dialog
    await expect(page.locator('[data-testid="notification-result"]')).toBeVisible();
  });

  test('should schedule payment reminders', async ({ page }) => {
    // Create an expense with reminders
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Payment Reminder Test');
    await page.fill('[data-testid="expense-amount"]', '50.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '15');
    
    // Enable reminders
    await page.check('[data-testid="enable-reminders"]');
    await page.fill('[data-testid="reminder-days"]', '3');
    
    // Save expense
    await page.click('[data-testid="save-expense"]');
    
    // Should show reminder scheduled
    await expect(page.locator('[data-testid="reminder-scheduled"]')).toBeVisible();
    await expect(page.locator('text=Payment reminder scheduled')).toBeVisible();
  });

  test('should schedule usage reminders', async ({ page }) => {
    // Create an expense with usage tracking
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Usage Reminder Test');
    await page.fill('[data-testid="expense-amount"]', '25.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    
    // Enable usage tracking
    await page.check('[data-testid="enable-usage-tracking"]');
    await page.fill('[data-testid="unused-days"]', '30');
    
    // Save expense
    await page.click('[data-testid="save-expense"]');
    
    // Should show usage reminder scheduled
    await expect(page.locator('[data-testid="usage-reminder-scheduled"]')).toBeVisible();
  });

  test('should show notification history', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Find notification history section
    await expect(page.locator('[data-testid="notification-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-list"]')).toBeVisible();
  });

  test('should mark notifications as read', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click on unread notification
    await page.click('[data-testid="unread-notification"]');
    
    // Should mark as read
    await expect(page.locator('[data-testid="notification-item"]')).not.toHaveClass(/unread/);
  });

  test('should clear notification history', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Click clear notifications
    await page.click('[data-testid="clear-notifications"]');
    
    // Confirm clear
    await page.click('[data-testid="confirm-clear"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="clear-success"]')).toBeVisible();
    await expect(page.locator('text=Notification history cleared')).toBeVisible();
  });

  test('should confirm usage for expense', async ({ page }) => {
    // Create an expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Usage Confirmation Test');
    await page.fill('[data-testid="expense-amount"]', '30.00');
    await page.click('[data-testid="save-expense"]');
    
    // Confirm usage
    await page.click('[data-testid="confirm-usage"]');
    
    // Should show confirmation
    await expect(page.locator('[data-testid="usage-confirmed"]')).toBeVisible();
    await expect(page.locator('text=Usage confirmed for')).toBeVisible();
  });

  test('should handle notification preferences', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Enable payment reminders
    await page.check('[data-testid="payment-reminders"]');
    
    // Disable usage reminders
    await page.uncheck('[data-testid="usage-reminders"]');
    
    // Save preferences
    await page.click('[data-testid="save-notification-settings"]');
    
    // Should show success
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    
    // Verify preferences are saved
    await expect(page.locator('[data-testid="payment-reminders"]')).toBeChecked();
    await expect(page.locator('[data-testid="usage-reminders"]')).not.toBeChecked();
  });

  test('should display notification badges', async ({ page }) => {
    // Create expense with upcoming payment
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Badge Test Expense');
    await page.fill('[data-testid="expense-amount"]', '100.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '1');
    await page.click('[data-testid="save-expense"]');
    
    // Should show notification badge
    await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="badge-count"]')).toContainText('1');
  });

  test('should handle notification errors gracefully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Try to enable notifications in unsupported environment
    await page.click('[data-testid="enable-notifications"]');
    
    // Should show appropriate error message
    await expect(page.locator('[data-testid="notification-error"]')).toBeVisible();
    await expect(page.locator('text=Notifications not supported')).toBeVisible();
  });

  test('should show notification scheduling status', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Should show scheduling status
    await expect(page.locator('[data-testid="scheduling-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-reminders"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-reminder-time"]')).toBeVisible();
  });

  test('should allow custom reminder timing', async ({ page }) => {
    // Create expense with custom reminder timing
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Custom Reminder Test');
    await page.fill('[data-testid="expense-amount"]', '75.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    
    // Set custom reminder days
    await page.fill('[data-testid="reminder-days"]', '7');
    
    // Save expense
    await page.click('[data-testid="save-expense"]');
    
    // Should show custom reminder scheduled
    await expect(page.locator('[data-testid="custom-reminder-scheduled"]')).toBeVisible();
    await expect(page.locator('text=7 days before due date')).toBeVisible();
  });

  test('should handle multiple notification types', async ({ page }) => {
    // Create multiple expenses
    await page.click('text=Expenses');
    
    // Payment reminder expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Payment Notification');
    await page.fill('[data-testid="expense-amount"]', '50.00');
    await page.check('[data-testid="enable-reminders"]');
    await page.click('[data-testid="save-expense"]');
    
    // Usage reminder expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Usage Notification');
    await page.fill('[data-testid="expense-amount"]', '25.00');
    await page.check('[data-testid="enable-usage-tracking"]');
    await page.click('[data-testid="save-expense"]');
    
    // Should show both notification types
    await expect(page.locator('[data-testid="payment-reminders-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="usage-reminders-count"]')).toContainText('1');
  });

  test('should respect notification quiet hours', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    
    // Set quiet hours
    await page.check('[data-testid="enable-quiet-hours"]');
    await page.fill('[data-testid="quiet-hours-start"]', '22:00');
    await page.fill('[data-testid="quiet-hours-end"]', '08:00');
    
    // Save settings
    await page.click('[data-testid="save-notification-settings"]');
    
    // Should show quiet hours configured
    await expect(page.locator('[data-testid="quiet-hours-configured"]')).toBeVisible();
    await expect(page.locator('[data-testid="quiet-hours-range"]')).toContainText('22:00 - 08:00');
  });
});
