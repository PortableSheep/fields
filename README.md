# Fields

A lightweight, cross-platform desktop app for filling and annotating PDF forms — built for the pain point of "print, hand-fill, scan" PDFs.

## Tech Stack

- **Tauri v2** — lightweight desktop shell (~5-10MB)
- **React + TypeScript** — frontend UI
- **pdf.js** (Apache 2.0) — PDF rendering
- **pdf-lib** (MIT) — PDF modification and saving

## Features

- 📄 **PDF Viewer** — multi-page scrolling, zoom, page thumbnails
- 🔍 **Smart Field Detection** — detects AcroForm fields AND heuristically finds "fill here" regions in print-and-fill PDFs
- ✏️ **Text Tool** — click anywhere to add text (multiple fonts including handwriting style)
- ☑️ **Checkbox Tool** — toggle checkboxes on/off
- 📅 **Date Tool** — date picker with format options (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- ✍️ **Signature Pad** — draw signatures with mouse/trackpad
- 💾 **Save Options** — save as editable PDF or flattened (permanent)
- ⌨️ **Keyboard Shortcuts** — Ctrl/Cmd+O, S, Z, Y, tool hotkeys (T, C, D, S)
- 🎨 **Dark/Light Theme** — follows system preference
- 📁 **Drag & Drop** — drop PDFs onto the window to open

## Getting Started

```bash
# Install dependencies
npm install

# Development mode
export PATH="$HOME/.cargo/bin:$PATH"  # if using rustup
npm run tauri dev

# Production build
npm run tauri build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + O | Open PDF |
| Ctrl/Cmd + S | Save (editable) |
| Ctrl/Cmd + Shift + S | Save (flattened) |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Y | Redo |
| T | Text tool |
| C | Checkbox tool |
| D | Date tool |
| S | Signature tool |
| Escape | Deselect tool |
| Delete | Remove selected annotation |
| +/- | Zoom in/out |

## Releasing

Releases are built automatically by GitHub Actions when a `release/*` branch is pushed.

### Cutting a Release

```bash
# Create a release branch from main
git checkout main
git pull
git checkout -b release/1.0.0
git push -u origin release/1.0.0
```

The workflow extracts the version from the branch name, syncs it into `tauri.conf.json`, `Cargo.toml`, and `package.json`, then builds for macOS (universal) and Windows (x64). The resulting draft release appears in GitHub Releases for review before publishing.

### One-Time Setup

#### 1. Apple Developer Certificate (macOS signing)

1. Join the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Create a **Developer ID Application** certificate at [Certificates, IDs & Profiles](https://developer.apple.com/account/resources/certificates/list)
3. Export the certificate as `.p12` from Keychain Access
4. Base64-encode it: `openssl base64 -A -in certificate.p12 -out cert-b64.txt`
5. Create an [app-specific password](https://support.apple.com/en-us/102654) for notarization

#### 2. Updater Signing Key

```bash
npx tauri signer generate -w ~/.tauri/fields.key
```

Save the **public key** (printed to stdout) — it goes in `tauri.conf.json` under `plugins.updater.pubkey`.

Save the **private key** (written to `~/.tauri/fields.key`) — it goes in GitHub Secrets.

#### 3. GitHub Secrets

Configure these in your repo under Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_PASSWORD` | App-specific password (not your main password) |
| `APPLE_TEAM_ID` | 10-character Team ID from developer.apple.com |
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/fields.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password from key generation (can be empty) |

### Auto-Updates

The app uses `tauri-plugin-updater` to check for updates on launch. When a new version is published on GitHub Releases, users see a banner and can install the update with one click. The update artifacts are signed with the ed25519 key pair and verified before installation.
