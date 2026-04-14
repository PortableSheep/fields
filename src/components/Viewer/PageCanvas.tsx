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
  const renderGenRef = useRef(0);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Increment generation so stale renders (from StrictMode re-mount
    // or rapid prop changes) bail out after the async getPage() call.
    const gen = ++renderGenRef.current;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(pageNumber);

      // Bail if a newer render was queued while we awaited
      if (gen !== renderGenRef.current) return;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;

      const renderTask = page.render({
        canvasContext: ctx,
        canvas: null as unknown as HTMLCanvasElement,
        viewport,
        transform,
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
      onPageRendered?.({
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height),
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
      // Bump generation so any in-flight render bails after its await
      renderGenRef.current++;
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
