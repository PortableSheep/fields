import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Annotation, TextAnnotation, CheckboxAnnotation, DateAnnotation, SignatureAnnotation } from '../types/annotations';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

function formatDate(value: string, format: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());

  switch (format) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    default: return value;
  }
}

export async function savePdf(
  originalBytes: Uint8Array,
  annotations: Annotation[],
  flatten: boolean
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();

  // Group annotations by page
  const byPage = new Map<number, Annotation[]>();
  for (const ann of annotations) {
    if (!byPage.has(ann.pageIndex)) byPage.set(ann.pageIndex, []);
    byPage.get(ann.pageIndex)!.push(ann);
  }

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [pageIndex, pageAnnotations] of byPage) {
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { height } = page.getSize();

    for (const ann of pageAnnotations) {
      // Convert screen coords back to PDF coords (bottom-left origin)
      const pdfY = height - ann.rect.y - ann.rect.height;

      switch (ann.type) {
        case 'text': {
          const textAnn = ann as TextAnnotation;
          if (!textAnn.value) continue;
          const { r, g, b } = hexToRgb(textAnn.color);
          page.drawText(textAnn.value, {
            x: ann.rect.x,
            y: pdfY,
            size: textAnn.fontSize,
            font: helvetica,
            color: rgb(r, g, b),
          });
          break;
        }
        case 'checkbox': {
          const cbAnn = ann as CheckboxAnnotation;
          if (cbAnn.showBorder) {
            page.drawRectangle({
              x: ann.rect.x,
              y: pdfY,
              width: ann.rect.width,
              height: ann.rect.height,
              borderColor: rgb(0.4, 0.4, 0.4),
              borderWidth: 1,
              color: undefined,
            });
          }
          if (!cbAnn.checked) continue;
          page.drawText('✓', {
            x: ann.rect.x + 2,
            y: pdfY + 2,
            size: Math.min(ann.rect.width, ann.rect.height) * 0.8,
            font: helvetica,
            color: rgb(0, 0, 0),
          });
          break;
        }
        case 'date': {
          const dateAnn = ann as DateAnnotation;
          if (!dateAnn.value) continue;
          const displayText = formatDate(dateAnn.value, dateAnn.format);
          const { r, g, b } = hexToRgb(dateAnn.color);
          page.drawText(displayText, {
            x: ann.rect.x,
            y: pdfY,
            size: dateAnn.fontSize,
            font: helvetica,
            color: rgb(r, g, b),
          });
          break;
        }
        case 'signature': {
          const sigAnn = ann as SignatureAnnotation;
          if (!sigAnn.dataUrl) continue;
          try {
            const pngBytes = await fetch(sigAnn.dataUrl).then((r) => r.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(new Uint8Array(pngBytes));
            page.drawImage(pngImage, {
              x: ann.rect.x,
              y: pdfY,
              width: ann.rect.width,
              height: ann.rect.height,
            });
          } catch (err) {
            console.error('Failed to embed signature:', err);
          }
          break;
        }
      }
    }
  }

  if (flatten) {
    // Flatten by removing any form fields
    const form = pdfDoc.getForm();
    try {
      form.flatten();
    } catch {
      // No form fields to flatten — that's fine
    }
  }

  return pdfDoc.save();
}
