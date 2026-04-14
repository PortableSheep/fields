import { useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DetectedField } from '../types/annotations';
import { detectHeuristicFields } from '../lib/field-detector';

export function useFieldDetection() {
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [detecting, setDetecting] = useState(false);

  const detectFields = useCallback(async (pdfDoc: PDFDocumentProxy): Promise<number> => {
    setDetecting(true);
    const fields: DetectedField[] = [];
    let fieldId = 0;

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);

        // 1. Detect AcroForm fields via pdf.js annotations
        const annotations = await page.getAnnotations();
        const viewport = page.getViewport({ scale: 1.0 });

        for (const ann of annotations) {
          if (ann.subtype === 'Widget' && ann.rect) {
            const [x1, y1, x2, y2] = ann.rect;
            // Convert PDF coordinates (bottom-left origin) to screen coordinates (top-left)
            const rect = {
              x: x1,
              y: viewport.height - y2,
              width: x2 - x1,
              height: y2 - y1,
            };

            let fieldType: DetectedField['fieldType'] = 'text';
            if (ann.checkBox || ann.radioButton) {
              fieldType = 'checkbox';
            }

            fields.push({
              id: `field-${fieldId++}`,
              pageIndex: i - 1,
              rect,
              label: ann.fieldName || `Field ${fieldId}`,
              fieldType,
              confidence: 1.0,
              source: 'acroform',
              accepted: false,
            });
          }
        }

        // 2. Run heuristic detection
        const textContent = await page.getTextContent();
        const heuristicFields = detectHeuristicFields(
          textContent as any,
          viewport,
          i - 1,
          fieldId
        );
        fieldId += heuristicFields.length;
        fields.push(...heuristicFields);
      }
    } catch (err) {
      console.error('Field detection error:', err);
    }

    setDetectedFields(fields);
    setDetecting(false);
    return fields.length;
  }, []);

  const acceptField = useCallback((fieldId: string) => {
    setDetectedFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, accepted: true } : f))
    );
  }, []);

  const dismissField = useCallback((fieldId: string) => {
    setDetectedFields((prev) => prev.filter((f) => f.id !== fieldId));
  }, []);

  const clearFields = useCallback(() => {
    setDetectedFields([]);
  }, []);

  return {
    detectedFields,
    detecting,
    detectFields,
    acceptField,
    dismissField,
    clearFields,
  };
}
