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
