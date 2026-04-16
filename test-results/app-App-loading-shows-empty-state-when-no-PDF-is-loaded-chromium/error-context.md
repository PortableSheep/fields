# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> App loading >> shows empty state when no PDF is loaded
- Location: e2e/app.spec.ts:12:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.app-layout')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.app-layout')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { readFileSync } from 'fs';
  3  | import { join, dirname } from 'path';
  4  | import { fileURLToPath } from 'url';
  5  | 
  6  | // Note: These E2E tests run against the Vite dev server (web layer only).
  7  | // Tauri-specific features (native dialogs, fs) are not available.
  8  | // We test the React app directly by loading PDFs via the app's drag-drop
  9  | // or by interacting with the UI after the app renders.
  10 | 
  11 | test.describe('App loading', () => {
  12 |   test('shows empty state when no PDF is loaded', async ({ page }) => {
  13 |     await page.goto('/');
  14 |     // Should show the empty state / welcome screen
> 15 |     await expect(page.locator('.app-layout')).toBeVisible();
     |                                               ^ Error: expect(locator).toBeVisible() failed
  16 |     // Statusbar should say no file
  17 |     await expect(page.locator('.statusbar')).toContainText('No file loaded');
  18 |   });
  19 | 
  20 |   test('toolbar is visible', async ({ page }) => {
  21 |     await page.goto('/');
  22 |     await expect(page.locator('.toolbar')).toBeVisible();
  23 |   });
  24 | 
  25 |   test('tool buttons exist but PDF-dependent ones are disabled', async ({ page }) => {
  26 |     await page.goto('/');
  27 |     // Zoom buttons should be disabled without a PDF
  28 |     const zoomIn = page.locator('button[title="Zoom In (+)"]');
  29 |     const zoomOut = page.locator('button[title="Zoom Out (-)"]');
  30 |     await expect(zoomIn).toBeDisabled();
  31 |     await expect(zoomOut).toBeDisabled();
  32 |   });
  33 | });
  34 | 
```