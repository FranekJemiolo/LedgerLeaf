import { test, expect } from '@playwright/test';

test.describe('Calendar View Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should display calendar view', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Verify calendar elements are present
    await expect(page.locator('h2')).toContainText('Calendar');
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="month-navigation"]')).toBeVisible();
    
    // Verify week days are displayed
    await expect(page.locator('text=Sun')).toBeVisible();
    await expect(page.locator('text=Mon')).toBeVisible();
    await expect(page.locator('text=Tue')).toBeVisible();
    await expect(page.locator('text=Wed')).toBeVisible();
    await expect(page.locator('text=Thu')).toBeVisible();
    await expect(page.locator('text=Fri')).toBeVisible();
    await expect(page.locator('text=Sat')).toBeVisible();
  });

  test('should navigate between months', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Get current month
    const currentMonth = await page.locator('[data-testid="current-month"]').textContent();
    
    // Navigate to next month
    await page.click('[data-testid="next-month"]');
    const nextMonth = await page.locator('[data-testid="current-month"]').textContent();
    expect(nextMonth).not.toBe(currentMonth);
    
    // Navigate to previous month
    await page.click('[data-testid="previous-month"]');
    const previousMonth = await page.locator('[data-testid="current-month"]').textContent();
    expect(previousMonth).not.toBe(nextMonth);
  });

  test('should return to today', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Navigate away from current month
    await page.click('[data-testid="next-month"]');
    await page.click('[data-testid="next-month"]');
    
    // Click Today button
    await page.click('[data-testid="today-button"]');
    
    // Should return to current month
    const today = new Date();
    const expectedMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const currentMonth = await page.locator('[data-testid="current-month"]').textContent();
    expect(currentMonth).toContain(expectedMonth);
  });

  test('should display expenses on calendar', async ({ page }) => {
    // First create a test expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Calendar Test Expense');
    await page.fill('[data-testid="expense-amount"]', '50.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '15');
    await page.click('[data-testid="save-expense"]');
    
    // Navigate to calendar
    await page.click('text=Calendar');
    
    // Should see expense indicator on calendar
    await expect(page.locator('[data-testid="expense-indicator"]')).toBeVisible();
    await expect(page.locator('text=Calendar Test Expense')).toBeVisible();
  });

  test('should show expense details on date selection', async ({ page }) => {
    // Create a test expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Detail Test Expense');
    await page.fill('[data-testid="expense-amount"]', '25.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '20');
    await page.click('[data-testid="save-expense"]');
    
    // Navigate to calendar
    await page.click('text=Calendar');
    
    // Click on a date with expense
    await page.click('[data-testid="calendar-day-with-expense"]');
    
    // Should show expense details
    await expect(page.locator('[data-testid="expense-details"]')).toBeVisible();
    await expect(page.locator('text=Detail Test Expense')).toBeVisible();
    await expect(page.locator('text=$25.00')).toBeVisible();
    await expect(page.locator('text=monthly')).toBeVisible();
  });

  test('should display monthly summary', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Verify monthly summary is present
    await expect(page.locator('[data-testid="monthly-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-days-count"]')).toBeVisible();
  });

  test('should show upcoming payments', async ({ page }) => {
    // Create test expenses
    await page.click('text=Expenses');
    
    // Create first expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Upcoming Payment 1');
    await page.fill('[data-testid="expense-amount"]', '100.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '1');
    await page.click('[data-testid="save-expense"]');
    
    // Create second expense
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Upcoming Payment 2');
    await page.fill('[data-testid="expense-amount"]', '75.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'weekly');
    await page.click('[data-testid="save-expense"]');
    
    // Navigate to calendar
    await page.click('text=Calendar');
    
    // Should show upcoming payments section
    await expect(page.locator('[data-testid="upcoming-payments"]')).toBeVisible();
    await expect(page.locator('text=Upcoming Payment 1')).toBeVisible();
    await expect(page.locator('text=Upcoming Payment 2')).toBeVisible();
    await expect(page.locator('text=$100.00')).toBeVisible();
    await expect(page.locator('text=$75.00')).toBeVisible();
  });

  test('should display urgency indicators', async ({ page }) => {
    // Create an overdue expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Overdue Expense');
    await page.fill('[data-testid="expense-amount"]', '50.00');
    await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
    await page.fill('[data-testid="expense-due-day"]', '1');
    await page.click('[data-testid="save-expense"]');
    
    // Navigate to calendar
    await page.click('text=Calendar');
    
    // Should show urgency indicator
    await expect(page.locator('[data-testid="urgency-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-indicator"]')).toBeVisible();
  });

  test('should handle empty calendar state', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Should show empty state message
    await expect(page.locator('[data-testid="no-expenses-message"]')).toBeVisible();
    await expect(page.locator('text=No expenses scheduled for this date')).toBeVisible();
  });

  test('should calculate monthly totals correctly', async ({ page }) => {
    // Create multiple expenses for the month
    await page.click('text=Expenses');
    
    // Create expenses
    const expenses = [
      { name: 'Monthly Expense 1', amount: '50.00', day: '5' },
      { name: 'Monthly Expense 2', amount: '75.00', day: '15' },
      { name: 'Monthly Expense 3', amount: '25.00', day: '25' }
    ];
    
    for (const expense of expenses) {
      await page.click('text=Add Expense');
      await page.fill('[data-testid="expense-name"]', expense.name);
      await page.fill('[data-testid="expense-amount"]', expense.amount);
      await page.selectOption('[data-testid="expense-frequency"]', 'monthly');
      await page.fill('[data-testid="expense-due-day"]', expense.day);
      await page.click('[data-testid="save-expense"]');
    }
    
    // Navigate to calendar
    await page.click('text=Calendar');
    
    // Verify monthly total
    const monthlyTotal = await page.locator('[data-testid="monthly-total"]').textContent();
    expect(monthlyTotal).toContain('$150.00');
  });

  test('should handle date selection correctly', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Click on a date
    await page.click('[data-testid="calendar-day"]:has-text("15")');
    
    // Should highlight selected date
    await expect(page.locator('[data-testid="calendar-day"]:has-text("15")')).toHaveClass(/selected/);
    
    // Click on different date
    await page.click('[data-testid="calendar-day"]:has-text("20")');
    
    // Should update selection
    await expect(page.locator('[data-testid="calendar-day"]:has-text("20")')).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="calendar-day"]:has-text("15")')).not.toHaveClass(/selected/);
  });

  test('should display different month views correctly', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Navigate to different months
    const months = ['January', 'February', 'March', 'April', 'May', 'June'];
    
    for (const month of months) {
      await page.click('[data-testid="next-month"]');
      const currentMonth = await page.locator('[data-testid="current-month"]').textContent();
      expect(currentMonth).toContain(month);
    }
  });

  test('should handle year navigation', async ({ page }) => {
    // Navigate to calendar tab
    await page.click('text=Calendar');
    
    // Get current year
    const currentYear = await page.locator('[data-testid="current-year"]').textContent();
    
    // Navigate through 12 months to reach next year
    for (let i = 0; i < 12; i++) {
      await page.click('[data-testid="next-month"]');
    }
    
    // Should be in next year
    const nextYear = await page.locator('[data-testid="current-year"]').textContent();
    expect(parseInt(nextYear)).toBe(parseInt(currentYear) + 1);
  });
});
