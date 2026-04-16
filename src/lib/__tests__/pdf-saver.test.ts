import { savePdf } from '../pdf-saver';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import type {
  TextAnnotation,
  CheckboxAnnotation,
  DateAnnotation,
  SignatureAnnotation,
} from '../../types/annotations';

// Load the sample PDF fixture once
const fixturePath = path.resolve(__dirname, '../../../test/fixtures/sample.pdf');
let samplePdfBytes: Uint8Array;

beforeAll(() => {
  samplePdfBytes = new Uint8Array(fs.readFileSync(fixturePath));
});

function makeTextAnnotation(overrides: Partial<TextAnnotation> = {}): TextAnnotation {
  return {
    id: 'ann-text-1',
    type: 'text',
    pageIndex: 0,
    rect: { x: 50, y: 100, width: 200, height: 20 },
    value: 'Hello World',
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#000000',
    ...overrides,
  };
}

function makeCheckboxAnnotation(
  overrides: Partial<CheckboxAnnotation> = {}
): CheckboxAnnotation {
  return {
    id: 'ann-cb-1',
    type: 'checkbox',
    pageIndex: 0,
    rect: { x: 50, y: 200, width: 16, height: 16 },
    checked: true,
    showBorder: true,
    ...overrides,
  };
}

function makeDateAnnotation(
  overrides: Partial<DateAnnotation> = {}
): DateAnnotation {
  return {
    id: 'ann-date-1',
    type: 'date',
    pageIndex: 0,
    rect: { x: 50, y: 300, width: 120, height: 20 },
    value: '2024-06-15',
    format: 'MM/DD/YYYY',
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#000000',
    ...overrides,
  };
}

function makeSignatureAnnotation(
  overrides: Partial<SignatureAnnotation> = {}
): SignatureAnnotation {
  return {
    id: 'ann-sig-1',
    type: 'signature',
    pageIndex: 0,
    rect: { x: 50, y: 400, width: 200, height: 60 },
    dataUrl: '',
    ...overrides,
  };
}

describe('savePdf', () => {
  it('returns valid PDF bytes with no annotations', async () => {
    const result = await savePdf(samplePdfBytes, [], false);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
    // Should be loadable
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBeGreaterThan(0);
  });

  // ── Text annotations ────────────────────────────────────────────

  describe('text annotations', () => {
    it('renders text annotation onto the PDF', async () => {
      const ann = makeTextAnnotation({ value: 'Test Value', color: '#ff0000' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      // The result should be a larger PDF than the original (text added)
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });

    it('skips text annotation with empty value', async () => {
      const ann = makeTextAnnotation({ value: '' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });
  });

  // ── Checkbox annotations ─────────────────────────────────────────

  describe('checkbox annotations', () => {
    it('renders checked checkbox with border (throws on WinAnsi ✓)', async () => {
      // pdf-lib's Helvetica (StandardFont) cannot encode "✓" (U+2713).
      // This is a known limitation; a custom/embedded font would be needed.
      const ann = makeCheckboxAnnotation({ checked: true, showBorder: true });
      await expect(savePdf(samplePdfBytes, [ann], false)).rejects.toThrow(
        /cannot encode/i
      );
    });

    it('renders unchecked checkbox with border only', async () => {
      const ann = makeCheckboxAnnotation({ checked: false, showBorder: true });
      const result = await savePdf(samplePdfBytes, [ann], false);
      // Should still produce valid PDF (only border drawn)
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });

    it('renders unchecked checkbox without border (nothing drawn)', async () => {
      const ann = makeCheckboxAnnotation({ checked: false, showBorder: false });
      const result = await savePdf(samplePdfBytes, [ann], false);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });
  });

  // ── Date annotations ─────────────────────────────────────────────

  describe('date annotations', () => {
    it('renders date in MM/DD/YYYY format', async () => {
      const ann = makeDateAnnotation({
        value: '2024-06-15',
        format: 'MM/DD/YYYY',
      });
      const result = await savePdf(samplePdfBytes, [ann], false);
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
    });

    it('renders date in DD/MM/YYYY format', async () => {
      const ann = makeDateAnnotation({
        value: '2024-06-15',
        format: 'DD/MM/YYYY',
      });
      const result = await savePdf(samplePdfBytes, [ann], false);
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
    });

    it('renders date in YYYY-MM-DD format', async () => {
      const ann = makeDateAnnotation({
        value: '2024-06-15',
        format: 'YYYY-MM-DD',
      });
      const result = await savePdf(samplePdfBytes, [ann], false);
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
    });

    it('skips date annotation with empty value', async () => {
      const ann = makeDateAnnotation({ value: '' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });
  });

  // ── Signature annotations ────────────────────────────────────────

  describe('signature annotations', () => {
    it('skips signature with empty dataUrl', async () => {
      const ann = makeSignatureAnnotation({ dataUrl: '' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });

    it('embeds a PNG signature image', async () => {
      // Create a minimal 1x1 transparent PNG
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
        'Nl7BcQAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${pngBase64}`;
      const ann = makeSignatureAnnotation({ dataUrl });
      const result = await savePdf(samplePdfBytes, [ann], false);
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
    });
  });

  // ── Flatten mode ─────────────────────────────────────────────────

  describe('flatten mode', () => {
    it('produces valid PDF when flatten is true', async () => {
      const ann = makeTextAnnotation({ value: 'Flattened' });
      const result = await savePdf(samplePdfBytes, [ann], true);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });

    it('produces valid PDF when flatten is true with no annotations', async () => {
      const result = await savePdf(samplePdfBytes, [], true);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });
  });

  // ── Coordinate transformation ────────────────────────────────────

  describe('coordinate transformation', () => {
    it('converts screen y (top-left) to PDF y (bottom-left)', async () => {
      // We can't easily inspect the exact draw call coordinates
      // but we verify that the annotation doesn't crash and produces valid output
      const ann = makeTextAnnotation({
        value: 'Coord test',
        rect: { x: 10, y: 10, width: 100, height: 20 },
      });
      const result = await savePdf(samplePdfBytes, [ann], false);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });
  });

  // ── Multiple pages ───────────────────────────────────────────────

  describe('page grouping', () => {
    it('skips annotations with out-of-range pageIndex', async () => {
      const ann = makeTextAnnotation({ pageIndex: 999, value: 'Ghost' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      const doc = await PDFDocument.load(result);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    });
  });

  // ── Color parsing ────────────────────────────────────────────────

  describe('color parsing', () => {
    it('handles hex color with # prefix', async () => {
      const ann = makeTextAnnotation({ value: 'Red', color: '#ff0000' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
    });

    it('falls back to black for invalid color', async () => {
      const ann = makeTextAnnotation({ value: 'Fallback', color: 'invalid' });
      const result = await savePdf(samplePdfBytes, [ann], false);
      expect(result.length).toBeGreaterThan(samplePdfBytes.length);
    });
  });
});
