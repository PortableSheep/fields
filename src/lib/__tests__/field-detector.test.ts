import { detectHeuristicFields } from '../field-detector';

// Minimal viewport mock matching pdfjs-dist PageViewport shape
function makeViewport(width = 612, height = 792) {
  return { width, height } as import('pdfjs-dist').PageViewport;
}

// Helper to build a TextItem-like object
function textItem(
  str: string,
  x: number,
  y: number,
  width: number,
  fontSize = 12
) {
  return {
    str,
    dir: 'ltr',
    width,
    height: fontSize,
    // transform: [scaleX, b, c, scaleY, tx, ty]
    // fontSize = sqrt(b² + d²)  where b=transform[1], d=transform[3]
    transform: [1, 0, 0, fontSize, x, y],
  };
}

describe('detectHeuristicFields', () => {
  const viewport = makeViewport();

  // ── Fill-line detection ──────────────────────────────────────────

  describe('fill-line detection', () => {
    it('detects underscores (___)', () => {
      const items = [
        textItem('Name', 50, 700, 40),
        textItem('___________', 100, 700, 120),
      ];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      expect(fields.length).toBeGreaterThanOrEqual(1);
      const fill = fields.find((f) => f.label === 'Name');
      expect(fill).toBeDefined();
      expect(fill!.fieldType).toBe('text');
      expect(fill!.source).toBe('heuristic');
    });

    it('detects dots (.....)', () => {
      const items = [textItem('........', 100, 700, 100)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      expect(fields.length).toBeGreaterThanOrEqual(1);
    });

    it('detects dashes (-----)', () => {
      const items = [textItem('--------', 100, 700, 100)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      expect(fields.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Standalone checkbox detection ────────────────────────────────

  describe('standalone checkbox detection', () => {
    it.each(['[ ]', '( )', '☐', '□', '◻', '◯'])(
      'detects "%s" as checkbox',
      (char) => {
        const items = [
          textItem('Accept terms', 50, 700, 80),
          textItem(char, 140, 700, 14),
        ];
        const fields = detectHeuristicFields({ items }, viewport, 0, 0);
        const cb = fields.find((f) => f.fieldType === 'checkbox');
        expect(cb).toBeDefined();
        expect(cb!.confidence).toBeGreaterThanOrEqual(0.55);
      }
    );
  });

  // ── Inline checkbox detection ────────────────────────────────────

  describe('inline checkbox detection', () => {
    it('detects "Yes ( )  No ( )" inline checkboxes', () => {
      const items = [textItem('Yes ( )  No ( )', 50, 700, 200)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const checkboxes = fields.filter((f) => f.fieldType === 'checkbox');
      expect(checkboxes.length).toBe(2);
    });

    it('assigns label from preceding word', () => {
      const items = [textItem('Agree ( )  Disagree ( )', 50, 700, 250)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const labels = fields.map((f) => f.label);
      expect(labels).toContain('Agree');
      expect(labels).toContain('Disagree');
    });
  });

  // ── Action pattern detection ─────────────────────────────────────

  describe('action pattern detection', () => {
    it.each(['check here', 'mark with an X', 'place an x', 'circle one'])(
      'detects action text "%s"',
      (text) => {
        const items = [textItem(text, 50, 700, 100)];
        const fields = detectHeuristicFields({ items }, viewport, 0, 0);
        expect(fields.length).toBeGreaterThanOrEqual(1);
        expect(fields[0].fieldType).toBe('checkbox');
      }
    );
  });

  // ── Colon-label detection ────────────────────────────────────────

  describe('colon-label detection', () => {
    it('detects "Label:" pattern', () => {
      const items = [textItem('Email:', 50, 700, 50)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      // May get both colon-label field and known-label field; at least one should exist
      expect(fields.length).toBeGreaterThanOrEqual(1);
      const colonField = fields.find((f) => f.label === 'Email');
      expect(colonField).toBeDefined();
      expect(colonField!.fieldType).toBe('text');
    });

    it('places field to the right of the label', () => {
      const items = [textItem('Phone:', 50, 700, 50)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const f = fields[0];
      expect(f.rect.x).toBeGreaterThan(50);
    });
  });

  // ── Known label + blank space detection ──────────────────────────

  describe('known label + blank space detection', () => {
    it('detects known label "Full Name" with space to right', () => {
      const items = [textItem('Full Name', 50, 700, 70)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      expect(fields.length).toBeGreaterThanOrEqual(1);
      const f = fields.find((f) => f.label === 'Full Name');
      expect(f).toBeDefined();
      expect(f!.fieldType).toBe('text');
    });

    it('infers date type for date-related labels', () => {
      const items = [textItem('Date of Birth', 50, 700, 90)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const f = fields.find((f) => f.fieldType === 'date');
      expect(f).toBeDefined();
    });

    it('infers signature type for signature labels', () => {
      const items = [textItem('Signature', 50, 700, 70)];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const f = fields.find((f) => f.fieldType === 'signature');
      expect(f).toBeDefined();
    });
  });

  // ── Stacked layout detection ─────────────────────────────────────

  describe('stacked layout detection', () => {
    it('detects label above with blank space below', () => {
      // "Name" at y=700, next text item far below at y=600 (big gap)
      const items = [
        textItem('Name', 50, 700, 50, 12),
        textItem('Some other text', 50, 600, 100, 12),
      ];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const stacked = fields.find(
        (f) => f.confidence === 0.55 || f.confidence === 0.6
      );
      expect(stacked).toBeDefined();
    });
  });

  // ── Confidence score ranges ──────────────────────────────────────

  describe('confidence scores', () => {
    it('all confidence values fall in [0.55, 1.0]', () => {
      const items = [
        textItem('Name:', 50, 700, 50),
        textItem('___________', 110, 700, 120),
        textItem('☐', 50, 660, 14),
        textItem('check here', 50, 620, 80),
      ];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      for (const f of fields) {
        expect(f.confidence).toBeGreaterThanOrEqual(0.55);
        expect(f.confidence).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // ── Deduplication ────────────────────────────────────────────────

  describe('deduplication', () => {
    it('does not produce duplicates at the same position', () => {
      // Two items at identical PDF coords
      const items = [
        textItem('Name:', 50, 700, 50),
        textItem('Name:', 50, 700, 50),
      ];
      const fields = detectHeuristicFields({ items }, viewport, 0, 0);
      const positions = fields.map(
        (f) => `${Math.round(f.rect.x)},${Math.round(f.rect.y)}`
      );
      const unique = new Set(positions);
      expect(unique.size).toBe(positions.length);
    });
  });

  // ── Coordinate conversion ────────────────────────────────────────

  describe('coordinate conversion', () => {
    it('converts bottom-left PDF origin to top-left screen origin', () => {
      const vp = makeViewport(612, 792);
      const pdfY = 700;
      const items = [textItem('___________', 100, pdfY, 120, 12)];
      const fields = detectHeuristicFields({ items }, vp, 0, 0);
      expect(fields.length).toBeGreaterThanOrEqual(1);
      // screen y ≈ viewport.height - pdfY = 792 - 700 = 92, minus fontSize
      const f = fields[0];
      expect(f.rect.y).toBeCloseTo(vp.height - pdfY - 12, 0);
    });
  });

  // ── Field IDs ────────────────────────────────────────────────────

  describe('field IDs', () => {
    it('uses startId for sequential field IDs', () => {
      const items = [
        textItem('___________', 50, 700, 120),
        textItem('___________', 50, 650, 120),
      ];
      const fields = detectHeuristicFields({ items }, viewport, 0, 42);
      expect(fields[0].id).toBe('field-42');
      expect(fields[1].id).toBe('field-43');
    });
  });
});
