import { setupTauriDriver, type TauriTestContext } from './setup';

/**
 * Tauri WebDriver E2E — Desktop integration tests.
 *
 * These tests run against the actual Tauri desktop application
 * and require tauri-driver + a debug build. Only supported on
 * Windows and Linux.
 *
 * See e2e-desktop/README.md for setup instructions.
 */

const isSupported = process.platform === 'win32' || process.platform === 'linux';

describe.skipIf(!isSupported)('Desktop: Window basics', () => {
  let ctx: TauriTestContext;

  beforeAll(async () => {
    ctx = await setupTauriDriver();
  }, 120_000);

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it('should have the correct window title', async () => {
    const title = await ctx.driver.getTitle();
    expect(title).toBe('Fields');
  });
});
