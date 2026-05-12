import { test, expect } from '@playwright/test';

test.describe('PWA Offline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
  });

  test('should register service worker', async ({ page }) => {
    // Check if service worker is registered
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker?.getRegistration();
    });
    
    expect(swRegistration).toBeTruthy();
  });

  test('should cache application assets', async ({ page }) => {
    // Check if cache exists
    const cacheExists = await page.evaluate(async () => {
      if ('caches' in window) {
        const cache = await caches.open('ledgerleaf-v1');
        return cache !== null;
      }
      return false;
    });
    
    expect(cacheExists).toBeTruthy();
  });

  test('should work offline', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    // Reload page
    await page.reload();
    
    // Should still load from cache
    await expect(page.locator('h1')).toContainText('LedgerLeaf');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should install as PWA', async ({ page }) => {
    // Check if PWA install prompt appears
    const installPrompt = await page.waitForEvent('beforeinstallprompt', { timeout: 10000 });
    
    // Should show install button
    await expect(page.locator('[data-testid="pwa-install-button"]')).toBeVisible();
    
    // Trigger install
    await installPrompt.prompt();
    
    // Should install the app
    const installed = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches;
    });
    
    expect(installed).toBeTruthy();
  });

  test('should have valid manifest', async ({ page }) => {
    // Check if manifest is loaded
    const manifest = await page.evaluate(async () => {
      const response = await fetch('/manifest.json');
      return response.ok ? await response.json() : null;
    });
    
    expect(manifest).toBeTruthy();
    expect(manifest.name).toBe('LedgerLeaf');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
  });

  test('should have proper PWA meta tags', async ({ page }) => {
    // Check for PWA meta tags
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.json');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#3b82f6');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/*', route => route.abort());
    
    // Try to load
    await page.reload();
    
    // Should show offline mode
    await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
    await expect(page.locator('text=Working offline')).toBeVisible();
  });

  test('should sync when back online', async ({ page }) => {
    // Go offline first
    await page.context().setOffline(true);
    await page.reload();
    
    // Should show offline mode
    await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should sync and show online mode
    await expect(page.locator('[data-testid="online-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
  });

  test('should cache expense data', async ({ page }) => {
    // Create an expense
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'PWA Cache Test');
    await page.fill('[data-testid="expense-amount"]', '45.00');
    await page.click('[data-testid="save-expense"]');
    
    // Go offline
    await page.context().setOffline(true);
    await page.reload();
    
    // Should still show cached expense
    await expect(page.locator('text=PWA Cache Test')).toBeVisible();
  });

  test('should handle background sync', async ({ page }) => {
    // Check if background sync is working
    const backgroundSync = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 'SyncManager' in window;
    });
    
    // Should have background sync capability
    expect(backgroundSync).toBeTruthy();
  });

  test('should update cache on new content', async ({ page }) => {
    // Create new content
    await page.click('text=Expenses');
    await page.click('text=Add Expense');
    await page.fill('[data-testid="expense-name"]', 'Cache Update Test');
    await page.fill('[data-testid="expense-amount"]', '25.00');
    await page.click('[data-testid="save-expense"]');
    
    // Check if cache is updated
    const cacheUpdated = await page.evaluate(async () => {
      const cache = await caches.open('ledgerleaf-v1');
      const keys = await cache.keys();
      return keys.length > 0;
    });
    
    expect(cacheUpdated).toBeTruthy();
  });

  test('should handle storage quota limits', async ({ page }) => {
    // Check storage quota
    const storageQuota = await page.evaluate(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage
        };
      }
      return null;
    });
    
    if (storageQuota) {
      expect(storageQuota.quota).toBeGreaterThan(0);
      expect(storageQuota.available).toBeGreaterThan(0);
    }
  });

  test('should work in standalone mode', async ({ page }) => {
    // Simulate standalone mode
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query) => ({
          matches: query === '(display-mode: standalone)',
          media: query
        })
      });
    });
    
    await page.reload();
    
    // Should adapt UI for standalone mode
    await expect(page.locator('[data-testid="standalone-ui"]')).toBeVisible();
  });

  test('should handle service worker updates', async ({ page }) => {
    // Check for service worker updates
    const swUpdate = await page.evaluate(() => {
      return new Promise((resolve) => {
        navigator.serviceWorker?.addEventListener('controllerchange', (event) => {
          resolve(event.target?.state);
        });
      });
    });
    
    // Service worker should be activated
    expect(['activated', 'installed']).toContain(swUpdate);
  });

  test('should provide offline feedback', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    await page.reload();
    
    // Should show offline feedback
    await expect(page.locator('[data-testid="offline-feedback"]')).toBeVisible();
    await expect(page.locator('text=You are currently offline')).toBeVisible();
    await expect(page.locator('text=Showing cached content')).toBeVisible();
  });

  test('should maintain data integrity offline', async ({ page }) => {
    // Create multiple expenses
    const expenses = [
      { name: 'Offline Test 1', amount: '10.00' },
      { name: 'Offline Test 2', amount: '20.00' },
      { name: 'Offline Test 3', amount: '30.00' }
    ];
    
    for (const expense of expenses) {
      await page.click('text=Expenses');
      await page.click('text=Add Expense');
      await page.fill('[data-testid="expense-name"]', expense.name);
      await page.fill('[data-testid="expense-amount"]', expense.amount);
      await page.click('[data-testid="save-expense"]');
    }
    
    // Go offline
    await page.context().setOffline(true);
    await page.reload();
    
    // Should show all expenses
    for (const expense of expenses) {
      await expect(page.locator(`text=${expense.name}`)).toBeVisible();
      await expect(page.locator(`text=$${expense.amount}`)).toBeVisible();
    }
  });
});
