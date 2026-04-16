import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // The app requires the Tauri runtime for file I/O. Start `npm run tauri dev`
  // in a separate terminal before running these tests. The webServer block below
  // only starts the Vite dev server (which serves the HTML shell) — the app
  // will error on Tauri API calls without the runtime. When `tauri dev` is
  // already running, reuseExistingServer: true will skip starting Vite.
  webServer: {
    command: 'npm run dev -- --port 1420',
    port: 1420,
    reuseExistingServer: true,
  },
});
