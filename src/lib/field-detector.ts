import type { PageViewport } from 'pdfjs-dist';
import type { DetectedField } from '../types/annotations';

interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
}

interface TextContentLike {
  items: TextItem[];
}

const LABEL_PATTERNS = [
  { pattern: /\b(name|full\s*name|first\s*name|last\s*name)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(date|dob|date\s*of\s*birth|d\.o\.b)\s*[:.]?\s*$/i, type: 'date' as const },
  { pattern: /\b(signature|sign\s*here|signed)\s*[:.]?\s*$/i, type: 'signature' as const },
  { pattern: /\b(address|street|city|state|zip|postal)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(email|e-mail)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(phone|tel|telephone|mobile|cell)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(ssn|social\s*security|tax\s*id|ein)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(company|employer|organization)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(title|position|occupation)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(number|#|no\.?)\s*[:.]?\s*$/i, type: 'text' as const },
  { pattern: /\b(yes|no)\s*$/i, type: 'checkbox' as const },
];

const FILL_LINE_PATTERN = /[_]{3,}|[\.]{5,}|[-]{5,}/;

export function detectHeuristicFields(
  textContent: TextContentLike,
  viewport: PageViewport,
  pageIndex: number,
  startId: number
): DetectedField[] {
  const fields: DetectedField[] = [];
  let fieldId = startId;
  const items = textContent.items as TextItem[];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.str || item.str.trim().length === 0) continue;

    const text = item.str.trim();
    const [, b, , d, tx, ty] = item.transform;

    // Convert PDF coords to screen coords
    const x = tx;
    const y = viewport.height - ty;
    const fontSize = Math.sqrt(b * b + d * d);
    const textWidth = item.width;

    // Check for fill lines (underscores, dots)
    if (FILL_LINE_PATTERN.test(text)) {
      // Look back for a label
      let label = 'Field';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prevItem = items[j];
        if (prevItem.str && prevItem.str.trim().length > 0) {
          label = prevItem.str.trim().replace(/[:.]?\s*$/, '');
          break;
        }
      }

      // Determine type from label
      let fieldType: DetectedField['fieldType'] = 'text';
      for (const { pattern, type } of LABEL_PATTERNS) {
        if (pattern.test(label)) {
          fieldType = type;
          break;
        }
      }

      fields.push({
        id: `field-${fieldId++}`,
        pageIndex,
        rect: {
          x,
          y: y - fontSize,
          width: Math.max(textWidth, 150),
          height: fontSize + 6,
        },
        label,
        fieldType,
        confidence: 0.8,
        source: 'heuristic',
        accepted: false,
      });
      continue;
    }

    // Check for label patterns followed by space or next-line blank area
    for (const { pattern, type } of LABEL_PATTERNS) {
      if (pattern.test(text)) {
        // Look ahead for blank space (no text immediately after on the same line)
        const fieldX = x + textWidth + 5;
        const fieldWidth = Math.min(200, viewport.width - fieldX - 20);

        if (fieldWidth > 50) {
          fields.push({
            id: `field-${fieldId++}`,
            pageIndex,
            rect: {
              x: fieldX,
              y: y - fontSize,
              width: fieldWidth,
              height: fontSize + 6,
            },
            label: text.replace(/[:.]?\s*$/, ''),
            fieldType: type,
            confidence: 0.6,
            source: 'heuristic',
            accepted: false,
          });
        }
        break;
      }
    }
  }

  return fields;
}
