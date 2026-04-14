import React, { useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

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
  const renderTaskRef = useRef<RenderTask | null>(null);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any in-progress render before starting a new one
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });
      const renderViewport = page.getViewport({ scale: scale * dpr });

      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Reset any lingering transform state before rendering
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: ctx,
        canvas: null as unknown as HTMLCanvasElement,
        viewport: renderViewport,
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
      onPageRendered?.({
        width: viewport.width,
        height: viewport.height,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    }
  }, [pdfDoc, pageNumber, scale, onPageRendered]);

  useEffect(() => {
    render();
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [render]);

  return (
    <div className="page-container" data-page={pageNumber}>
      <canvas ref={canvasRef} />
      {children}
    </div>
  );
};
