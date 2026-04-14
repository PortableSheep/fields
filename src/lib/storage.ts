import { readFile, writeFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

const SIGNATURES_FILE = 'signatures.json';
const RECENT_FILES_FILE = 'recent-files.json';
const MAX_RECENT_FILES = 10;

async function getAppDataPath(): Promise<string> {
  const dir = await appDataDir();
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const dir = await getAppDataPath();
    const path = `${dir}${fileName}`;
    const fileExists = await exists(path);
    if (!fileExists) return fallback;
    const bytes = await readFile(path);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(fileName: string, data: T): Promise<void> {
  try {
    const dir = await getAppDataPath();
    const path = `${dir}${fileName}`;
    const text = JSON.stringify(data, null, 2);
    await writeFile(path, new TextEncoder().encode(text));
  } catch (err) {
    console.error(`Failed to write ${fileName}:`, err);
  }
}

// Signature persistence
export interface SavedSignature {
  id: string;
  dataUrl: string;
  createdAt: string;
  label: string;
}

export async function loadSavedSignatures(): Promise<SavedSignature[]> {
  return readJsonFile<SavedSignature[]>(SIGNATURES_FILE, []);
}

export async function saveSignature(dataUrl: string, label?: string): Promise<SavedSignature> {
  const signatures = await loadSavedSignatures();
  const sig: SavedSignature = {
    id: `sig-${Date.now()}`,
    dataUrl,
    createdAt: new Date().toISOString(),
    label: label || `Signature ${signatures.length + 1}`,
  };
  signatures.push(sig);
  await writeJsonFile(SIGNATURES_FILE, signatures);
  return sig;
}

export async function deleteSavedSignature(id: string): Promise<void> {
  const signatures = await loadSavedSignatures();
  await writeJsonFile(SIGNATURES_FILE, signatures.filter((s) => s.id !== id));
}

// Recent files
export interface RecentFile {
  path: string;
  name: string;
  openedAt: string;
}

export async function loadRecentFiles(): Promise<RecentFile[]> {
  return readJsonFile<RecentFile[]>(RECENT_FILES_FILE, []);
}

export async function addRecentFile(path: string, name: string): Promise<void> {
  const files = await loadRecentFiles();
  const filtered = files.filter((f) => f.path !== path);
  filtered.unshift({ path, name, openedAt: new Date().toISOString() });
  await writeJsonFile(RECENT_FILES_FILE, filtered.slice(0, MAX_RECENT_FILES));
}
