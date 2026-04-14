import { useState, useCallback } from 'react';
import {
  loadSnapshots as loadSnapshotsFromDisk,
  saveSnapshot as saveSnapshotToDisk,
  clearHistory as clearHistoryOnDisk,
  type Snapshot,
} from '../lib/history';
import type { Annotation } from '../types/annotations';

export function useHistory() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async (filePath: string, contentFingerprint?: Uint8Array) => {
    setLoading(true);
    try {
      const snaps = await loadSnapshotsFromDisk(filePath, contentFingerprint);
      setSnapshots(snaps);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addSnapshot = useCallback(
    async (filePath: string, annotations: Annotation[], label?: string, contentFingerprint?: Uint8Array) => {
      try {
        const snap = await saveSnapshotToDisk(filePath, annotations, label, contentFingerprint);
        setSnapshots((prev) => {
          const updated = [...prev, snap];
          if (updated.length > 50) updated.shift();
          return updated;
        });
        return snap;
      } catch (err) {
        console.error('Failed to save snapshot:', err);
        return null;
      }
    },
    []
  );

  const clearHistory = useCallback(async (filePath: string, contentFingerprint?: Uint8Array) => {
    await clearHistoryOnDisk(filePath, contentFingerprint);
    setSnapshots([]);
  }, []);

  return {
    snapshots,
    loading,
    loadHistory,
    addSnapshot,
    clearHistory,
  };
}
