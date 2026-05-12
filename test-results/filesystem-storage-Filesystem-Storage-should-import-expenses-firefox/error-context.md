# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: filesystem-storage.spec.ts >> Filesystem Storage >> should import expenses
- Location: tests/filesystem-storage.spec.ts:271:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 0
```

# Test source

```ts
  212 |     expect(retrievedConfig.currency).toBe('EUR');
  213 |     expect(retrievedConfig.default_reminder_days).toBe(7);
  214 |     expect(retrievedConfig.default_unused_days).toBe(60);
  215 |   });
  216 | 
  217 |   test('should export to CSV', async () => {
  218 |     const testExpenses = [
  219 |       {
  220 |         id: 'export-1',
  221 |         name: 'Export Test 1',
  222 |         type: 'subscription' as const,
  223 |         status: 'active' as const,
  224 |         cost: { amount: 15.00, currency: 'USD' },
  225 |         billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
  226 |         category: ['export'],
  227 |         reminders: { enabled: true, days_before: 3 },
  228 |         usage_tracking: { enabled: true, remind_after_days_unused: 45 },
  229 |         metadata: {
  230 |           created_at: new Date().toISOString(),
  231 |           updated_at: new Date().toISOString()
  232 |         },
  233 |         notes: 'Export test 1',
  234 |         tags: ['export1']
  235 |       },
  236 |       {
  237 |         id: 'export-2',
  238 |         name: 'Export Test 2',
  239 |         type: 'service' as const,
  240 |         status: 'active' as const,
  241 |         cost: { amount: 25.50, currency: 'USD' },
  242 |         billing: { frequency: 'weekly' as const, interval: 1, due_day: 2 },
  243 |         category: ['export'],
  244 |         reminders: { enabled: false, days_before: 7 },
  245 |         usage_tracking: { enabled: false, remind_after_days_unused: 60 },
  246 |         metadata: {
  247 |           created_at: new Date().toISOString(),
  248 |           updated_at: new Date().toISOString()
  249 |         },
  250 |         notes: 'Export test 2',
  251 |         tags: ['export2']
  252 |       }
  253 |     ];
  254 | 
  255 |     // Create test expenses
  256 |     for (const expense of testExpenses) {
  257 |       await filesystemStorageService.createExpense(expense);
  258 |     }
  259 | 
  260 |     // Export to CSV
  261 |     const csvContent = await filesystemStorageService.exportToCSV(testExpenses);
  262 | 
  263 |     // Verify CSV content
  264 |     expect(csvContent).toContain('id,name,type,status');
  265 |     expect(csvContent).toContain('Export Test 1');
  266 |     expect(csvContent).toContain('Export Test 2');
  267 |     expect(csvContent).toContain('15.00');
  268 |     expect(csvContent).toContain('25.50');
  269 |   });
  270 | 
  271 |   test('should import expenses', async () => {
  272 |     const importExpenses = [
  273 |       {
  274 |         id: 'import-1',
  275 |         name: 'Import Test 1',
  276 |         type: 'subscription' as const,
  277 |         status: 'active' as const,
  278 |         cost: { amount: 35.00, currency: 'GBP' },
  279 |         billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
  280 |         category: ['import'],
  281 |         reminders: { enabled: true, days_before: 3 },
  282 |         usage_tracking: { enabled: true, remind_after_days_unused: 45 },
  283 |         metadata: {
  284 |           created_at: new Date().toISOString(),
  285 |           updated_at: new Date().toISOString()
  286 |         },
  287 |         notes: 'Import test 1',
  288 |         tags: ['import1']
  289 |       },
  290 |       {
  291 |         id: 'import-2',
  292 |         name: 'Import Test 2',
  293 |         type: 'service' as const,
  294 |         status: 'active' as const,
  295 |         cost: { amount: 45.75, currency: 'GBP' },
  296 |         billing: { frequency: 'weekly' as const, interval: 1, due_day: 2 },
  297 |         category: ['import'],
  298 |         reminders: { enabled: false, days_before: 7 },
  299 |         usage_tracking: { enabled: false, remind_after_days_unused: 60 },
  300 |         metadata: {
  301 |           created_at: new Date().toISOString(),
  302 |           updated_at: new Date().toISOString()
  303 |         },
  304 |         notes: 'Import test 2',
  305 |         tags: ['import2']
  306 |       }
  307 |     ] as Expense[];
  308 | 
  309 |     // Import expenses
  310 |     const importResult = await filesystemStorageService.importExpenses(importExpenses);
  311 | 
> 312 |     expect(importResult.imported).toBe(2);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  313 |     expect(importResult.errors).toHaveLength(0);
  314 | 
  315 |     // Verify imported expenses
  316 |     const allExpenses = await filesystemStorageService.loadAllExpenses();
  317 |     expect(allExpenses).toHaveLength(2);
  318 | 
  319 |     const expenseNames = allExpenses.map(e => e.name);
  320 |     expect(expenseNames).toContain('Import Test 1');
  321 |     expect(expenseNames).toContain('Import Test 2');
  322 |   });
  323 | 
  324 |   test('should handle file system errors gracefully', async () => {
  325 |     // Mock file system error
  326 |     await mockFileSystemError();
  327 | 
  328 |     await expect(filesystemStorageService.loadAllExpenses()).rejects.toThrow();
  329 |     await expect(filesystemStorageService.createExpense({
  330 |       id: 'error-1',
  331 |       name: 'Error Test',
  332 |       type: 'subscription' as const,
  333 |       status: 'active' as const,
  334 |       cost: { amount: 10.00, currency: 'USD' },
  335 |       billing: { frequency: 'monthly' as const, interval: 1, due_day: 1 },
  336 |       category: ['test'],
  337 |       reminders: { enabled: true, days_before: 3 },
  338 |       usage_tracking: { enabled: true, remind_after_days_unused: 45 },
  339 |       metadata: {
  340 |         created_at: new Date().toISOString(),
  341 |         updated_at: new Date().toISOString()
  342 |       },
  343 |       notes: 'Error test',
  344 |       tags: ['error']
  345 |     })).rejects.toThrow();
  346 |   });
  347 | });
  348 | 
  349 | // Mock functions for testing
  350 | async function mockFileSystemAccess() {
  351 |   // This would be implemented with actual mocking framework
  352 |   // For now, this is a placeholder
  353 |   console.log('Mocking File System Access API for tests');
  354 | }
  355 | 
  356 | async function mockFileSystemError() {
  357 |   // This would be implemented with actual mocking framework
  358 |   // For now, this is a placeholder
  359 |   console.log('Mocking File System Access API error for tests');
  360 | }
  361 | 
```