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
];

const FILL_LINE_PATTERN = /[_]{3,}|[\.]{5,}|[-]{5,}/;
const LABEL_COLON_PATTERN = /^(.{2,30})\s*[:]\s*$/;

// Standalone bracket/box checkbox characters
const BRACKET_CHECKBOX_PATTERN = /^[\(\[]\s*[\)\]]$|^☐$|^□$|^◻$|^◯$/;
// Inline bracket checkboxes embedded in text
const INLINE_CHECKBOX_PATTERN = /[\(\[]\s*[\)\]]|☐|□|◻|◯/g;
// "Check here" / "mark with an X" action text
const ACTION_MARK_PATTERN = /\b(check\s*(here|one|all|box|if|the)|mark\s*(here|one|all|with\s*an?\s*x|the)|place\s*an?\s*x|circle\s*(one|yes|no)|x\s+here)\b/i;

function isTextItem(item: TextItem | { type?: string }): item is TextItem {
  return 'str' in item && 'transform' in item;
}

function inferFieldType(label: string): DetectedField['fieldType'] {
  for (const { pattern, type } of LABEL_PATTERNS) {
    if (pattern.test(label)) return type;
  }
  return 'text';
}

function isSameLine(a: TextItem, b: TextItem): boolean {
  const aFontSize = Math.sqrt(a.transform[1] ** 2 + a.transform[3] ** 2);
  return Math.abs(a.transform[5] - b.transform[5]) < aFontSize * 0.5;
}

function isLineBelow(a: TextItem, b: TextItem, tolerance = 2.5): boolean {
  const aFontSize = Math.sqrt(a.transform[1] ** 2 + a.transform[3] ** 2);
  const gap = a.transform[5] - b.transform[5]; // PDF y: up is positive
  return gap > 0 && gap < aFontSize * tolerance;
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
  const usedPositions = new Set<string>();

  const posKey = (px: number, py: number) => `${Math.round(px)},${Math.round(py)}`;

  const addField = (f: Omit<DetectedField, 'id'>) => {
    const key = posKey(f.rect.x, f.rect.y);
    if (usedPositions.has(key)) return;
    usedPositions.add(key);
    fields.push({ ...f, id: `field-${fieldId++}` });
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.str || item.str.trim().length === 0) continue;

    const text = item.str.trim();
    const [, b, , d, tx, ty] = item.transform;

    const x = tx;
    const y = viewport.height - ty;
    const fontSize = Math.sqrt(b * b + d * d);
    const textWidth = item.width;

    // --- 1. Fill lines (underscores, dots, dashes) ---
    if (FILL_LINE_PATTERN.test(text)) {
      let label = 'Field';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prevItem = items[j];
        if (prevItem.str && prevItem.str.trim().length > 0) {
          label = prevItem.str.trim().replace(/[:.]?\s*$/, '');
          break;
        }
      }

      addField({
        pageIndex,
        rect: { x, y: y - fontSize, width: Math.max(textWidth, 150), height: fontSize + 6 },
        label,
        fieldType: inferFieldType(label),
        confidence: 0.8,
        source: 'heuristic',
        accepted: false,
      });
      continue;
    }

    // --- 2. Standalone bracket/box checkbox: ( ), [ ], ☐, □ ---
    if (BRACKET_CHECKBOX_PATTERN.test(text)) {
      let label = 'Checkbox';
      for (const offset of [1, -1, 2, -2]) {
        const neighbor = items[i + offset];
        if (neighbor?.str?.trim() && !BRACKET_CHECKBOX_PATTERN.test(neighbor.str.trim())) {
          label = neighbor.str.trim().replace(/[:.]?\s*$/, '');
          break;
        }
      }

      addField({
        pageIndex,
        rect: { x, y: y - fontSize, width: fontSize + 4, height: fontSize + 4 },
        label,
        fieldType: 'checkbox',
        confidence: 0.75,
        source: 'heuristic',
        accepted: false,
      });
      continue;
    }

    // --- 3. Inline bracket checkboxes: "Yes ( )  No ( )" ---
    if (INLINE_CHECKBOX_PATTERN.test(text) && text.length > 3) {
      // Reset lastIndex after the test
      INLINE_CHECKBOX_PATTERN.lastIndex = 0;
      const matches = [...text.matchAll(INLINE_CHECKBOX_PATTERN)];
      for (const match of matches) {
        if (match.index === undefined) continue;
        const charRatio = match.index / text.length;
        const matchX = x + textWidth * charRatio;
        const before = text.slice(0, match.index).trim();
        const labelWord = before.split(/\s+/).pop() || 'Option';

        addField({
          pageIndex,
          rect: { x: matchX, y: y - fontSize, width: fontSize + 4, height: fontSize + 4 },
          label: labelWord,
          fieldType: 'checkbox',
          confidence: 0.7,
          source: 'heuristic',
          accepted: false,
        });
      }
      continue;
    }

    // --- 4. "Check here" / "mark with an X" action patterns ---
    if (ACTION_MARK_PATTERN.test(text)) {
      addField({
        pageIndex,
        rect: { x: Math.max(0, x - fontSize - 4), y: y - fontSize, width: fontSize + 4, height: fontSize + 4 },
        label: text.replace(/[:.]?\s*$/, ''),
        fieldType: 'checkbox',
        confidence: 0.75,
        source: 'heuristic',
        accepted: false,
      });
      continue;
    }

    // --- 5. "Label:" colon-terminated labels ---
    const colonMatch = text.match(LABEL_COLON_PATTERN);
    if (colonMatch) {
      const label = colonMatch[1].trim();
      const fieldType = inferFieldType(label);
      const fieldX = x + textWidth + 5;
      const fieldWidth = Math.min(200, viewport.width - fieldX - 20);

      if (fieldWidth > 50) {
        addField({
          pageIndex,
          rect: { x: fieldX, y: y - fontSize, width: fieldWidth, height: fontSize + 6 },
          label,
          fieldType,
          confidence: 0.7,
          source: 'heuristic',
          accepted: false,
        });
      }
      continue;
    }

    // --- 6. Known label with blank space to the right ---
    for (const { pattern, type } of LABEL_PATTERNS) {
      if (pattern.test(text)) {
        const fieldX = x + textWidth + 5;
        const fieldWidth = Math.min(200, viewport.width - fieldX - 20);

        if (fieldWidth > 50) {
          addField({
            pageIndex,
            rect: { x: fieldX, y: y - fontSize, width: fieldWidth, height: fontSize + 6 },
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

    // --- 7. Label on this line with blank space below (stacked layout) ---
    if (LABEL_PATTERNS.some(({ pattern }) => pattern.test(text))) {
      const nextNonEmpty = items.slice(i + 1).find((it) => it.str?.trim());
      if (nextNonEmpty) {
        const onSame = isSameLine(item, nextNonEmpty);
        const justBelow = isLineBelow(item, nextNonEmpty);
        // If next text is far below (gap > normal line spacing), there's blank fill space
        if (!onSame && !justBelow) {
          const belowY = y + fontSize * 0.5;
          addField({
            pageIndex,
            rect: { x, y: belowY, width: Math.max(textWidth, 200), height: fontSize + 6 },
            label: text.replace(/[:.]?\s*$/, ''),
            fieldType: inferFieldType(text),
            confidence: 0.55,
            source: 'heuristic',
            accepted: false,
          });
        }
      }
    }
  }

  return fields;
}
