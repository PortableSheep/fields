import React, { useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PageCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  children?: React.ReactNode;
  onPageRendered?: (dims: { width: number; height: number }) => void;
}

export const PageCanvas: React.FC<PageCanvasProps> = ({
  pdfDoc,
  pageNumber,
  scale,
  children,
  onPageRendered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });
      const displayViewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderTask = page.render({
        canvasContext: ctx,
        canvas,
        viewport,
      });

      await renderTask.promise;
      onPageRendered?.({
        width: displayViewport.width,
        height: displayViewport.height,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    }
  }, [pdfDoc, pageNumber, scale, onPageRendered]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className="page-container" data-page={pageNumber}>
      <canvas ref={canvasRef} />
      {children}
    </div>
  );
};
