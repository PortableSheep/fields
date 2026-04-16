import { vi } from "vitest";

// In-memory file system for mocking @tauri-apps/plugin-fs
const fileStore = new Map<string, Uint8Array>();

export const BaseDirectory = {
  App: 1,
  AppConfig: 2,
  AppData: 3,
  AppLocalData: 4,
  AppLog: 5,
  Audio: 6,
  Cache: 7,
  Config: 8,
  Data: 9,
  Desktop: 10,
  Document: 11,
  Download: 12,
  Home: 13,
  LocalData: 14,
  Log: 15,
  Picture: 16,
  Public: 17,
  Resource: 18,
  Runtime: 19,
  Temp: 20,
  Template: 21,
  Video: 22,
} as const;

function resolveKey(path: string, options?: { baseDir?: number }): string {
  const prefix = options?.baseDir != null ? `${options.baseDir}:` : "";
  return `${prefix}${path}`;
}

export const readFile = vi.fn(
  async (path: string, options?: { baseDir?: number }): Promise<Uint8Array> => {
    const key = resolveKey(path, options);
    const data = fileStore.get(key);
    if (!data) {
      throw new Error(`File not found: ${path}`);
    }
    return data;
  },
);

export const writeFile = vi.fn(
  async (
    path: string,
    contents: Uint8Array,
    options?: { baseDir?: number },
  ): Promise<void> => {
    const key = resolveKey(path, options);
    fileStore.set(key, contents);
  },
);

export const readTextFile = vi.fn(
  async (path: string, options?: { baseDir?: number }): Promise<string> => {
    const data = await readFile(path, options);
    return new TextDecoder().decode(data);
  },
);

export const writeTextFile = vi.fn(
  async (
    path: string,
    contents: string,
    options?: { baseDir?: number },
  ): Promise<void> => {
    const encoded = new TextEncoder().encode(contents);
    await writeFile(path, encoded, options);
  },
);

export const exists = vi.fn(
  async (path: string, options?: { baseDir?: number }): Promise<boolean> => {
    const key = resolveKey(path, options);
    return fileStore.has(key);
  },
);

export const mkdir = vi.fn(async (): Promise<void> => {
  // No-op in the in-memory mock; directories are implicit.
});

// Mock @tauri-apps/plugin-dialog
export const open = vi.fn(async (): Promise<string | string[] | null> => {
  return null;
});

export const save = vi.fn(async (): Promise<string | null> => {
  return null;
});

// Grouped re-exports for convenient vi.mock() factory usage
export const fsMocks = {
  readFile,
  writeFile,
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  BaseDirectory,
};

export const dialogMocks = {
  open,
  save,
};

/**
 * Reset the in-memory file store and all mocks.
 * Call this in beforeEach / afterEach to isolate tests.
 */
export function resetMocks(): void {
  fileStore.clear();
  vi.restoreAllMocks();
}
