import { Builder, By, Capabilities } from 'selenium-webdriver';
import { spawn, spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Path to the built Tauri application binary
function getApplicationPath(): string {
  const name = 'fields';
  switch (process.platform) {
    case 'win32':
      return resolve(projectRoot, 'src-tauri/target/debug', `${name}.exe`);
    case 'linux':
      return resolve(projectRoot, 'src-tauri/target/debug', name);
    default:
      throw new Error(
        `Tauri WebDriver is not supported on ${process.platform}. ` +
        'Only Windows and Linux are supported (macOS lacks a WKWebView driver).'
      );
  }
}

export interface TauriTestContext {
  driver: InstanceType<typeof Builder> extends { build(): Promise<infer D> } ? D : never;
  cleanup: () => Promise<void>;
}

/**
 * Start tauri-driver and create a WebDriver session against the built app.
 * Call cleanup() when done to tear down both processes.
 *
 * Prerequisites:
 *   1. cargo install tauri-driver --locked
 *   2. npm run tauri build -- --debug --no-bundle
 */
export async function setupTauriDriver(): Promise<TauriTestContext> {
  const applicationPath = getApplicationPath();

  // Start tauri-driver (WebDriver proxy)
  const tauriDriverBin = resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver');
  const tauriDriver = spawn(tauriDriverBin, [], {
    stdio: [null, process.stdout, process.stderr],
  });

  let exiting = false;
  tauriDriver.on('error', (err) => {
    if (!exiting) {
      console.error('tauri-driver error:', err);
    }
  });

  // Give tauri-driver a moment to start
  await new Promise((r) => setTimeout(r, 2000));

  const capabilities = new Capabilities();
  capabilities.set('tauri:options', { application: applicationPath });
  capabilities.setBrowserName('wry');

  const driver = await new Builder()
    .withCapabilities(capabilities)
    .usingServer('http://127.0.0.1:4444/')
    .build();

  const cleanup = async () => {
    exiting = true;
    await driver.quit().catch(() => {});
    tauriDriver.kill();
  };

  return { driver, cleanup };
}
