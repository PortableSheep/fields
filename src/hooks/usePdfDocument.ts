import { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

export function usePdfDocument() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fileName, setFileName] = useState('');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  const loadPdf = useCallback(async (bytes: Uint8Array, name: string) => {
    setLoading(true);
    setError(null);

    // Destroy previous document
    if (pdfDocRef.current) {
      await pdfDocRef.current.destroy();
    }

    try {
      const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      pdfDocRef.current = doc;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setPdfBytes(bytes);
      setFileName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setPdfDoc(null);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const closePdf = useCallback(async () => {
    if (pdfDocRef.current) {
      await pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setPdfBytes(null);
    setFileName('');
    setError(null);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 5.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.25));
  }, []);

  const fitToWidth = useCallback((containerWidth: number) => {
    if (!pdfDoc) return;
    pdfDoc.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1.0 });
      const newScale = (containerWidth - 40) / viewport.width;
      setScale(Math.max(0.25, Math.min(newScale, 5.0)));
    });
  }, [pdfDoc]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, []);

  return {
    pdfDoc,
    totalPages,
    currentPage,
    scale,
    fileName,
    pdfBytes,
    loading,
    error,
    loadPdf,
    closePdf,
    setScale,
    zoomIn,
    zoomOut,
    fitToWidth,
    goToPage,
    setCurrentPage,
  };
}
