import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../useHistory';
import type { Snapshot } from '../../lib/history';
import type { Annotation } from '../../types/annotations';

vi.mock('../../lib/history', () => ({
  loadSnapshots: vi.fn(),
  saveSnapshot: vi.fn(),
  clearHistory: vi.fn(),
}));

import {
  loadSnapshots as loadSnapshotsMock,
  saveSnapshot as saveSnapshotMock,
  clearHistory as clearHistoryMock,
} from '../../lib/history';

const mockLoadSnapshots = vi.mocked(loadSnapshotsMock);
const mockSaveSnapshot = vi.mocked(saveSnapshotMock);
const mockClearHistory = vi.mocked(clearHistoryMock);

const sampleSnapshot: Snapshot = {
  id: 'snap-1',
  timestamp: '2024-01-01T00:00:00.000Z',
  label: '1 text',
  annotations: [],
};

const sampleAnnotation: Annotation = {
  id: 'ann-1',
  type: 'text',
  pageIndex: 0,
  rect: { x: 0, y: 0, width: 100, height: 30 },
  value: 'hello',
  fontSize: 14,
  fontFamily: 'sans-serif',
  color: '#000',
};

describe('useHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty snapshots and loading=false', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.snapshots).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  describe('loadHistory', () => {
    it('sets loading=true then false', async () => {
      let resolveLoad: (v: Snapshot[]) => void;
      mockLoadSnapshots.mockReturnValue(
        new Promise((r) => {
          resolveLoad = r;
        })
      );

      const { result } = renderHook(() => useHistory());

      let promise: Promise<void>;
      act(() => {
        promise = result.current.loadHistory('/test.pdf');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveLoad!([]);
        await promise!;
      });

      expect(result.current.loading).toBe(false);
    });

    it('populates snapshots array', async () => {
      mockLoadSnapshots.mockResolvedValue([sampleSnapshot]);

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.loadHistory('/test.pdf');
      });

      expect(result.current.snapshots).toEqual([sampleSnapshot]);
    });

    it('delegates to loadSnapshots with correct arguments', async () => {
      mockLoadSnapshots.mockResolvedValue([]);
      const fp = new Uint8Array([1, 2, 3]);

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.loadHistory('/path/to/file.pdf', fp);
      });

      expect(mockLoadSnapshots).toHaveBeenCalledWith('/path/to/file.pdf', fp);
    });

    it('sets snapshots to empty array on error', async () => {
      mockLoadSnapshots.mockRejectedValue(new Error('disk error'));

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.loadHistory('/bad.pdf');
      });

      expect(result.current.snapshots).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('addSnapshot', () => {
    it('adds to snapshots and delegates to saveSnapshot', async () => {
      mockSaveSnapshot.mockResolvedValue(sampleSnapshot);

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        const snap = await result.current.addSnapshot('/test.pdf', [sampleAnnotation], 'My label');
        expect(snap).toEqual(sampleSnapshot);
      });

      expect(result.current.snapshots).toEqual([sampleSnapshot]);
      expect(mockSaveSnapshot).toHaveBeenCalledWith('/test.pdf', [sampleAnnotation], 'My label', undefined);
    });

    it('passes contentFingerprint to saveSnapshot', async () => {
      mockSaveSnapshot.mockResolvedValue(sampleSnapshot);
      const fp = new Uint8Array([10, 20]);

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.addSnapshot('/test.pdf', [], 'label', fp);
      });

      expect(mockSaveSnapshot).toHaveBeenCalledWith('/test.pdf', [], 'label', fp);
    });

    it('returns null on error', async () => {
      mockSaveSnapshot.mockRejectedValue(new Error('write failed'));

      const { result } = renderHook(() => useHistory());

      let snap: any;
      await act(async () => {
        snap = await result.current.addSnapshot('/test.pdf', []);
      });

      expect(snap).toBeNull();
      expect(result.current.snapshots).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('empties snapshots and delegates to clearHistory on disk', async () => {
      mockLoadSnapshots.mockResolvedValue([sampleSnapshot]);
      mockClearHistory.mockResolvedValue(undefined);

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.loadHistory('/test.pdf');
      });
      expect(result.current.snapshots).toHaveLength(1);

      await act(async () => {
        await result.current.clearHistory('/test.pdf');
      });

      expect(result.current.snapshots).toEqual([]);
      expect(mockClearHistory).toHaveBeenCalledWith('/test.pdf', undefined);
    });

    it('passes contentFingerprint to clearHistory on disk', async () => {
      mockClearHistory.mockResolvedValue(undefined);
      const fp = new Uint8Array([5]);

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        await result.current.clearHistory('/test.pdf', fp);
      });

      expect(mockClearHistory).toHaveBeenCalledWith('/test.pdf', fp);
    });
  });
});
