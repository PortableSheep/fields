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
  items: (TextItem | { type?: string })[];
}

const LABEL_PATTERNS = [
  { pattern: /\b(name|full\s*name|first\s*name|last\s*name|middle\s*name|maiden\s*name)\b/i, type: 'text' as const },
  { pattern: /\b(date|dob|date\s*of\s*birth|d\.o\.b|birth\s*date|expir|effective\s*date)\b/i, type: 'date' as const },
  { pattern: /\b(signature|sign\s*here|signed|applicant.*sign|patient.*sign|owner.*sign)\b/i, type: 'signature' as const },
  { pattern: /\b(address|street|city|state|zip|postal|apt|suite|county)\b/i, type: 'text' as const },
  { pattern: /\b(email|e-mail|e\s*mail)\b/i, type: 'text' as const },
  { pattern: /\b(phone|tel|telephone|mobile|cell|fax)\b/i, type: 'text' as const },
  { pattern: /\b(ssn|social\s*security|tax\s*id|ein|tin)\b/i, type: 'text' as const },
  { pattern: /\b(company|employer|organization|business|firm)\b/i, type: 'text' as const },
  { pattern: /\b(title|position|occupation|job\s*title|role)\b/i, type: 'text' as const },
  { pattern: /\b(number|#|no\.?|account|policy|license|permit)\b/i, type: 'text' as const },
  { pattern: /\b(print\s*name|printed\s*name)\b/i, type: 'text' as const },
  { pattern: /\b(initial|initials)\b/i, type: 'text' as const },
  { pattern: /\b(amount|total|balance|payment|price|cost|fee)\b/i, type: 'text' as const },
  { pattern: /\b(description|reason|comment|notes|remarks|explain)\b/i, type: 'text' as const },
  { pattern: /\b(yes|no)\s*$/i, type: 'checkbox' as const },
  { pattern: /^\s*\[\s*\]\s*/i, type: 'checkbox' as const },
];

// Patterns that indicate a fill-in line
const FILL_LINE_PATTERN = /[_]{3,}|[\.]{5,}|[-]{5,}/;

// A label followed by a colon (or similar) and then mostly whitespace/blanks
const LABEL_COLON_PATTERN = /^(.{2,30})\s*[:]\s*$/;

function isTextItem(item: TextItem | { type?: string }): item is TextItem {
  return 'str' in item && 'transform' in item;
}

function inferFieldType(label: string): DetectedField['fieldType'] {
  for (const { pattern, type } of LABEL_PATTERNS) {
    if (pattern.test(label)) return type;
  }
  return 'text';
}

export function detectHeuristicFields(
  textContent: TextContentLike,
  viewport: PageViewport,
  pageIndex: number,
  startId: number
): DetectedField[] {
  const fields: DetectedField[] = [];
  let fieldId = startId;
  const items = textContent.items.filter(isTextItem);

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

    // Check for fill lines (underscores, dots, dashes)
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

      const fieldType = inferFieldType(label);

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

    // Check for "Label:" pattern (colon-terminated labels with space after)
    const colonMatch = text.match(LABEL_COLON_PATTERN);
    if (colonMatch) {
      const label = colonMatch[1].trim();
      const fieldType = inferFieldType(label);
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
          label,
          fieldType,
          confidence: 0.7,
          source: 'heuristic',
          accepted: false,
        });
      }
      continue;
    }

    // Check for known label patterns followed by whitespace/blank area
    for (const { pattern, type } of LABEL_PATTERNS) {
      if (pattern.test(text)) {
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
