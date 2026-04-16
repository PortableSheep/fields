import { test, expect } from '@playwright/test';

// These E2E tests run against the web layer served by Vite.
// The app requires the Tauri runtime for file I/O (plugin-fs, plugin-dialog),
// so these tests must be run while `npm run tauri dev` is active — a plain
// `npm run dev` will serve the HTML but the app will error on Tauri API calls.
//
// Usage:
//   Terminal 1: npm run tauri dev
//   Terminal 2: npm run test:e2e

test.describe('App loading', () => {
  test('shows empty state when no PDF is loaded', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await expect(page.locator('.statusbar')).toContainText('No file loaded');
  });

  test('toolbar is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.toolbar')).toBeVisible();
  });

  test('tool buttons exist but PDF-dependent ones are disabled', async ({ page }) => {
    await page.goto('/');
    const zoomIn = page.locator('button[title="Zoom In (+)"]');
    const zoomOut = page.locator('button[title="Zoom Out (-)"]');
    await expect(zoomIn).toBeDisabled();
    await expect(zoomOut).toBeDisabled();
  });
});

test.describe('Keyboard shortcuts (no PDF)', () => {
  test('T key activates text tool', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await page.keyboard.press('t');
    const textBtn = page.locator('button[title*="Text"]');
    await expect(textBtn).toHaveClass(/active/);
  });

  test('C key activates checkbox tool', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await page.keyboard.press('c');
    const checkboxBtn = page.locator('button[title*="Checkbox"]');
    await expect(checkboxBtn).toHaveClass(/active/);
  });

  test('D key activates date tool', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await page.keyboard.press('d');
    const dateBtn = page.locator('button[title*="Date"]');
    await expect(dateBtn).toHaveClass(/active/);
  });

  test('S key activates signature tool', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await page.keyboard.press('s');
    const sigBtn = page.locator('button[title*="Signature"]');
    await expect(sigBtn).toHaveClass(/active/);
  });

  test('Escape deactivates current tool', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    await page.keyboard.press('t');
    const textBtn = page.locator('button[title*="Text"]');
    await expect(textBtn).toHaveClass(/active/);

    await page.keyboard.press('Escape');
    const pointerBtn = page.locator('button[title*="Select"]');
    await expect(pointerBtn).toHaveClass(/active/);
  });

  test('tool toggle — clicking active tool deactivates it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-layout')).toBeVisible();
    const textBtn = page.locator('button[title*="Text"]');

    await page.keyboard.press('t');
    await expect(textBtn).toHaveClass(/active/);

    await textBtn.click();
    const pointerBtn = page.locator('button[title*="Select"]');
    await expect(pointerBtn).toHaveClass(/active/);
  });
});
