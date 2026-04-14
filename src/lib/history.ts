import { readFile, writeFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import type { Annotation } from '../types/annotations';

const HISTORY_DIR = 'history';
const MAX_SNAPSHOTS = 50;

export interface Snapshot {
  id: string;
  timestamp: string;
  label: string;
  annotations: Annotation[];
}

function djb2(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

// Hash file path + content fingerprint (first 1KB) for robust identity.
// Same filename in different dirs with different content → different key.
function hashFileIdentity(filePath: string, contentFingerprint?: Uint8Array): string {
  const pathHash = djb2(filePath);
  if (!contentFingerprint || contentFingerprint.length === 0) {
    return `h${pathHash.toString(36)}`;
  }
  // Mix in first 1KB of file content
  let contentHash = 0;
  const len = Math.min(contentFingerprint.length, 1024);
  for (let i = 0; i < len; i++) {
    contentHash = ((contentHash << 5) - contentHash + contentFingerprint[i]) | 0;
  }
  contentHash = Math.abs(contentHash);
  return `h${pathHash.toString(36)}_${contentHash.toString(36)}`;
}

function summarizeAnnotations(annotations: Annotation[]): string {
  if (annotations.length === 0) return 'Empty';
  const counts: Record<string, number> = {};
  for (const a of annotations) {
    counts[a.type] = (counts[a.type] || 0) + 1;
  }
  const parts = Object.entries(counts).map(
    ([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`
  );
  return parts.join(', ');
}

async function getHistoryDir(): Promise<string> {
  const base = await appDataDir();
  const dir = `${base}${HISTORY_DIR}`;
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

async function getHistoryPath(filePath: string, contentFingerprint?: Uint8Array): Promise<string> {
  const dir = await getHistoryDir();
  return `${dir}/${hashFileIdentity(filePath, contentFingerprint)}.json`;
}

export async function loadSnapshots(filePath: string, contentFingerprint?: Uint8Array): Promise<Snapshot[]> {
  try {
    const path = await getHistoryPath(filePath, contentFingerprint);
    const fileExists = await exists(path);
    if (!fileExists) return [];
    const bytes = await readFile(path);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as Snapshot[];
  } catch {
    return [];
  }
}

export async function saveSnapshot(
  filePath: string,
  annotations: Annotation[],
  label?: string,
  contentFingerprint?: Uint8Array
): Promise<Snapshot> {
  const snapshots = await loadSnapshots(filePath, contentFingerprint);
  const snapshot: Snapshot = {
    id: `snap-${Date.now()}`,
    timestamp: new Date().toISOString(),
    label: label || summarizeAnnotations(annotations),
    annotations: JSON.parse(JSON.stringify(annotations)),
  };

  snapshots.push(snapshot);

  // Prune oldest if over limit
  while (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.shift();
  }

  const path = await getHistoryPath(filePath, contentFingerprint);
  await writeFile(path, new TextEncoder().encode(JSON.stringify(snapshots, null, 2)));

  return snapshot;
}

export async function clearHistory(filePath: string, contentFingerprint?: Uint8Array): Promise<void> {
  try {
    const path = await getHistoryPath(filePath, contentFingerprint);
    const fileExists = await exists(path);
    if (fileExists) {
      await writeFile(path, new TextEncoder().encode('[]'));
    }
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}
