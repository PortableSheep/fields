import { resetMocks } from '../../../test/mocks/tauri-plugins';
import type { Annotation, TextAnnotation, CheckboxAnnotation } from '../../types/annotations';

vi.mock('@tauri-apps/plugin-fs', async () => {
  const m = await import('../../../test/mocks/tauri-plugins');
  return m.fsMocks;
});

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(async () => '/mock-app-data/'),
}));

// Import after mocks are set up
const { loadSnapshots, saveSnapshot, clearHistory } = await import('../history');

function makeTextAnnotation(value = 'hello'): TextAnnotation {
  return {
    id: 'a1',
    type: 'text',
    pageIndex: 0,
    rect: { x: 0, y: 0, width: 100, height: 20 },
    value,
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#000000',
  };
}

function makeCheckboxAnnotation(): CheckboxAnnotation {
  return {
    id: 'a2',
    type: 'checkbox',
    pageIndex: 0,
    rect: { x: 0, y: 0, width: 16, height: 16 },
    checked: true,
    showBorder: true,
  };
}

beforeEach(async () => {
  resetMocks();
  // Re-register mocks after resetMocks calls restoreAllMocks
  const pathMod = await import('@tauri-apps/api/path');
  vi.mocked(pathMod.appDataDir).mockResolvedValue('/mock-app-data/');
});

describe('history module', () => {
  // ── saveSnapshot ─────────────────────────────────────────────────

  describe('saveSnapshot', () => {
    it('creates a snapshot with correct format', async () => {
      const ann = makeTextAnnotation();
      const snap = await saveSnapshot('/test/file.pdf', [ann]);

      expect(snap.id).toMatch(/^snap-\d+$/);
      expect(snap.timestamp).toBeTruthy();
      expect(snap.annotations).toHaveLength(1);
      expect(snap.annotations[0]).toEqual(ann);
    });

    it('uses provided label', async () => {
      const snap = await saveSnapshot('/test/file.pdf', [], 'My label');
      expect(snap.label).toBe('My label');
    });

    it('deep-copies annotations', async () => {
      const ann = makeTextAnnotation();
      const snap = await saveSnapshot('/test/file.pdf', [ann]);
      ann.value = 'mutated';
      expect(snap.annotations[0]).toHaveProperty('value', 'hello');
    });
  });

  // ── loadSnapshots ────────────────────────────────────────────────

  describe('loadSnapshots', () => {
    it('returns empty array for non-existent file', async () => {
      const result = await loadSnapshots('/nonexistent/file.pdf');
      expect(result).toEqual([]);
    });

    it('returns saved snapshots', async () => {
      const ann = makeTextAnnotation();
      await saveSnapshot('/test/file.pdf', [ann], 'First');
      await saveSnapshot('/test/file.pdf', [ann], 'Second');

      const snaps = await loadSnapshots('/test/file.pdf');
      expect(snaps).toHaveLength(2);
      expect(snaps[0].label).toBe('First');
      expect(snaps[1].label).toBe('Second');
    });
  });

  // ── Snapshot cap at 50 ───────────────────────────────────────────

  describe('snapshot cap', () => {
    it('prunes oldest when exceeding 50 snapshots', async () => {
      for (let i = 0; i < 51; i++) {
        await saveSnapshot('/test/cap.pdf', [], `Snap ${i}`);
      }

      const snaps = await loadSnapshots('/test/cap.pdf');
      expect(snaps).toHaveLength(50);
      // The first one ("Snap 0") should have been pruned
      expect(snaps[0].label).toBe('Snap 1');
      expect(snaps[49].label).toBe('Snap 50');
    });
  });

  // ── clearHistory ─────────────────────────────────────────────────

  describe('clearHistory', () => {
    it('clears the history file', async () => {
      await saveSnapshot('/test/file.pdf', [makeTextAnnotation()]);
      let snaps = await loadSnapshots('/test/file.pdf');
      expect(snaps.length).toBeGreaterThan(0);

      await clearHistory('/test/file.pdf');
      snaps = await loadSnapshots('/test/file.pdf');
      expect(snaps).toEqual([]);
    });

    it('does not throw for non-existent file', async () => {
      await expect(clearHistory('/no-such-file.pdf')).resolves.not.toThrow();
    });
  });

  // ── Label auto-summarization ─────────────────────────────────────

  describe('label summarization', () => {
    it('summarizes annotation types', async () => {
      const anns: Annotation[] = [
        makeTextAnnotation('a'),
        makeTextAnnotation('b'),
        makeCheckboxAnnotation(),
      ];
      const snap = await saveSnapshot('/test/file.pdf', anns);
      expect(snap.label).toContain('2 texts');
      expect(snap.label).toContain('1 checkbox');
    });

    it('labels empty annotations as "Empty"', async () => {
      const snap = await saveSnapshot('/test/file.pdf', []);
      expect(snap.label).toBe('Empty');
    });
  });

  // ── Snapshot ID format ───────────────────────────────────────────

  describe('snapshot ID format', () => {
    it('has format "snap-{timestamp}"', async () => {
      const before = Date.now();
      const snap = await saveSnapshot('/test/file.pdf', []);
      const after = Date.now();

      expect(snap.id).toMatch(/^snap-\d+$/);
      const ts = parseInt(snap.id.replace('snap-', ''), 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });
});
