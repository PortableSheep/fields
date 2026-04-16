# Copilot Instructions for Fields

## Build & Run

```bash
npm install                # Install frontend dependencies
npm run tauri dev          # Dev mode with hot reload (requires Rust toolchain)
npm run tauri build        # Production build
npm run build              # Frontend-only build (tsc + vite)
```

Rust toolchain must be on PATH: `export PATH="$HOME/.cargo/bin:$PATH"` if using rustup.

There are no tests or linters configured in this project.

## Architecture

**Tauri v2 desktop app** — React + TypeScript frontend with a minimal Rust backend. The Rust side (`src-tauri/src/lib.rs`) is a thin shell that only registers Tauri plugins (fs, dialog, opener). There are no Tauri commands or Rust↔JS RPC — all file I/O is done from TypeScript via `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`.

### State Management: Custom Hooks

No state management library. All state lives in custom hooks composed together in `App.tsx`:

- `usePdfDocument` — PDF loading/rendering, zoom (0.25–5.0), page navigation
- `useAnnotations` — Annotation CRUD with undo/redo stacks (deep-cloned via `JSON.parse(JSON.stringify())`)
- `useFieldDetection` — AcroForm field extraction + heuristic text analysis
- `useHistory` — Thin wrapper around `lib/history.ts` for disk-persisted snapshots

`App.tsx` (~500 lines) is the orchestrator — it composes all hooks and manages local state for active tool, signature pad visibility, notifications, file path, etc. State flows down to components via props; callbacks flow up via `onX` props.

### Lib Modules (Business Logic)

Pure logic lives in `src/lib/`, separate from React:

- `field-detector.ts` — Heuristic field detection using 7 strategies (fill lines, checkbox patterns, colon labels, etc.) with confidence scores (0.55–1.0)
- `pdf-saver.ts` — Renders annotations onto PDF using pdf-lib; supports editable and flattened output
- `history.ts` — Snapshot persistence to `{APP_DATA}/history/{hash}.json`, capped at 50 per file. Files identified by djb2 hash of path + first 1KB fingerprint
- `storage.ts` — Persists saved signatures and recent files to AppData JSON files

### PDF Coordinate System

PDF uses bottom-left origin; screen uses top-left. The transformation `y_screen = viewport.height - y_pdf` is applied in field-detector.ts (detection) and pdf-saver.ts (rendering). Both directions must stay in sync.

### Component Organization

```
src/components/
├── Annotations/    # Renderers + interaction (drag, resize, click-to-add)
│   └── AnnotationLayer.tsx  # Core interaction layer (mouse events, field suggestions)
├── Viewer/         # PDF page rendering, scroll-based pagination, thumbnails
├── Toolbar/        # Tool buttons, zoom, context-aware style controls
├── History/        # Snapshot list with restore/clear
├── FormFields/     # Detected field display
└── common/         # EmptyState (no-PDF placeholder + recent files)
```

## Conventions

### Naming

- **Event handlers**: `handleX` in defining component, `onX` for callback props
- **Booleans**: `is/has/can` prefix (`isSelected`, `hasPdf`, `canUndo`)
- **Files**: PascalCase for components, camelCase for hooks, kebab-case for lib modules
- **IDs**: Prefixed by type — `ann-{timestamp}-{counter}`, `snap-{timestamp}`, `sig-{timestamp}`, `field-{id}`
- **Types**: No `I` prefix. `Props` suffix for component props, `Type` suffix for type aliases

### Styling

Plain CSS with CSS custom properties in `src/styles/globals.css`. Theming via `@media (prefers-color-scheme: dark/light)` — no manual theme toggle. No CSS modules, no Tailwind, no CSS-in-JS.

### Patterns

- **Dirty tracking**: `isDirty` flag set on annotation changes, cleared on save via `markClean()`. Controls save button state and triggers confirmation on file switch/close.
- **Debounced auto-snapshots**: 5-second debounce after annotation changes triggers history snapshot.
- **Refs for transient state**: `sigPlacementRef`, `pdfFingerprintRef`, `notifTimerRef`, `snapshotTimerRef` — things that shouldn't trigger re-renders.
- **Undo/redo**: In-memory only (lost on app close). Selection is cleared on undo/redo to avoid stale references.
- **Error handling in storage**: All disk reads return fallback values (empty arrays) on error — never throws.
- **WebKit stream compatibility**: `useFieldDetection` uses `page.streamTextContent()` + manual `getReader()` loop instead of `for-await-of` on ReadableStream, because WebKit (Tauri on macOS) doesn't support the latter.

### Annotation Type System

Discriminated union in `src/types/annotations.ts`:

```typescript
type Annotation = TextAnnotation | CheckboxAnnotation | DateAnnotation | SignatureAnnotation
```

Each has a `type` discriminator, `pageIndex`, and `rect` (screen coordinates). Type-specific fields: `value`/`fontSize`/`fontFamily`/`color` for text/date, `checked`/`showBorder` for checkbox, `dataUrl` for signature (PNG as data URL).
