import { resetMocks } from '../../../test/mocks/tauri-plugins';

vi.mock('@tauri-apps/plugin-fs', async () => {
  const m = await import('../../../test/mocks/tauri-plugins');
  return m.fsMocks;
});

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(async () => '/mock-app-data/'),
}));

const {
  saveSignature,
  loadSavedSignatures,
  deleteSavedSignature,
  addRecentFile,
  loadRecentFiles,
} = await import('../storage');

beforeEach(async () => {
  resetMocks();
  const pathMod = await import('@tauri-apps/api/path');
  vi.mocked(pathMod.appDataDir).mockResolvedValue('/mock-app-data/');
});

describe('storage module', () => {
  // ── Signature persistence ────────────────────────────────────────

  describe('saveSignature', () => {
    it('adds a signature and persists it', async () => {
      const sig = await saveSignature('data:image/png;base64,abc', 'My Sig');

      expect(sig.id).toMatch(/^sig-\d+$/);
      expect(sig.dataUrl).toBe('data:image/png;base64,abc');
      expect(sig.label).toBe('My Sig');
      expect(sig.createdAt).toBeTruthy();

      const loaded = await loadSavedSignatures();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(sig.id);
    });

    it('appends multiple signatures', async () => {
      await saveSignature('url1');
      await saveSignature('url2');
      await saveSignature('url3');

      const loaded = await loadSavedSignatures();
      expect(loaded).toHaveLength(3);
    });

    it('uses default label when none provided', async () => {
      const sig = await saveSignature('url');
      expect(sig.label).toBe('Signature 1');
    });
  });

  // ── loadSavedSignatures ──────────────────────────────────────────

  describe('loadSavedSignatures', () => {
    it('returns empty array when no file exists', async () => {
      const result = await loadSavedSignatures();
      expect(result).toEqual([]);
    });
  });

  // ── deleteSavedSignature ─────────────────────────────────────────

  describe('deleteSavedSignature', () => {
    it('removes signature by ID', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const sig1 = await saveSignature('url1', 'First');
      vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));
      const sig2 = await saveSignature('url2', 'Second');
      vi.useRealTimers();

      expect(sig1.id).not.toBe(sig2.id);
      await deleteSavedSignature(sig1.id);

      const loaded = await loadSavedSignatures();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(sig2.id);
    });

    it('does nothing if ID not found', async () => {
      await saveSignature('url1');
      await deleteSavedSignature('non-existent-id');

      const loaded = await loadSavedSignatures();
      expect(loaded).toHaveLength(1);
    });
  });

  // ── Recent files ─────────────────────────────────────────────────

  describe('addRecentFile', () => {
    it('prepends to the recent files list', async () => {
      await addRecentFile('/a.pdf', 'a.pdf');
      await addRecentFile('/b.pdf', 'b.pdf');

      const files = await loadRecentFiles();
      expect(files[0].path).toBe('/b.pdf');
      expect(files[1].path).toBe('/a.pdf');
    });

    it('deduplicates by path (moves to front)', async () => {
      await addRecentFile('/a.pdf', 'a.pdf');
      await addRecentFile('/b.pdf', 'b.pdf');
      await addRecentFile('/a.pdf', 'a.pdf');

      const files = await loadRecentFiles();
      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('/a.pdf');
    });
  });

  describe('recent files cap', () => {
    it('caps at 10 files', async () => {
      for (let i = 0; i < 15; i++) {
        await addRecentFile(`/file-${i}.pdf`, `file-${i}.pdf`);
      }

      const files = await loadRecentFiles();
      expect(files).toHaveLength(10);
      // Most recent should be first
      expect(files[0].path).toBe('/file-14.pdf');
    });
  });

  // ── loadRecentFiles ──────────────────────────────────────────────

  describe('loadRecentFiles', () => {
    it('returns empty array when no file exists', async () => {
      const result = await loadRecentFiles();
      expect(result).toEqual([]);
    });
  });

  // ── Error fallback behavior ──────────────────────────────────────

  describe('error fallback', () => {
    it('loadSavedSignatures returns empty array on read error', async () => {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(readFile).mockRejectedValueOnce(new Error('disk error'));
      // exists will return false for the file since store was reset,
      // so it returns fallback before readFile is called.
      // Instead, let's set up exists to return true, then readFile to throw
      const { exists: existsMock } = await import('@tauri-apps/plugin-fs');
      vi.mocked(existsMock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      vi.mocked(readFile).mockRejectedValueOnce(new Error('disk error'));

      const result = await loadSavedSignatures();
      expect(result).toEqual([]);
    });

    it('loadRecentFiles returns empty array on read error', async () => {
      const { readFile, exists: existsMock } = await import('@tauri-apps/plugin-fs');
      vi.mocked(existsMock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      vi.mocked(readFile).mockRejectedValueOnce(new Error('disk error'));

      const result = await loadRecentFiles();
      expect(result).toEqual([]);
    });
  });
});
