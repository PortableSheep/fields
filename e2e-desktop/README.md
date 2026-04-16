# Tauri WebDriver E2E Tests

Desktop-level E2E tests using Tauri's WebDriver integration.

## Platform Support

- ✅ **Windows** — uses Microsoft Edge WebDriver
- ✅ **Linux** — uses WebKitWebDriver
- ❌ **macOS** — not supported (no WKWebView driver available)

## Prerequisites

```bash
# Install tauri-driver
cargo install tauri-driver --locked

# Linux: ensure WebKitWebDriver is available
which WebKitWebDriver  # or install webkit2gtk-driver

# Windows: install matching Edge Driver
# https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/

# Build the app in debug mode
npm run tauri build -- --debug --no-bundle
```

## Running

```bash
npm run test:e2e:desktop
```
