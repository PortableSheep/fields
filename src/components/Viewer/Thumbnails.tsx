import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface ThumbnailsProps {
  pdfDoc: PDFDocumentProxy;
  totalPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

const THUMB_SCALE = 0.3;

export const Thumbnails: React.FC<ThumbnailsProps> = ({
  pdfDoc,
  totalPages,
  currentPage,
  onPageSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<Set<number>>(new Set());

  const renderThumbnail = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement) => {
      if (rendered.has(pageNum)) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: THUMB_SCALE });

        // Skip DPR scaling for thumbnails — they're small, quality is fine at 1×
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          canvas: null as unknown as HTMLCanvasElement,
          viewport,
        }).promise;
        setRendered((prev) => new Set(prev).add(pageNum));
      } catch (err) {
        console.error(`Thumbnail render error page ${pageNum}:`, err);
      }
    },
    [pdfDoc, rendered]
  );

  useEffect(() => {
    setRendered(new Set());
  }, [pdfDoc]);

  return (
    <div className="sidebar" ref={containerRef}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          className={`thumbnail ${currentPage === pageNum ? 'active' : ''}`}
          onClick={() => onPageSelect(pageNum)}
        >
          <canvas
            ref={(el) => {
              if (el && !rendered.has(pageNum)) {
                renderThumbnail(pageNum, el);
              }
            }}
          />
          <div className="thumbnail-label">{pageNum}</div>
        </div>
      ))}
    </div>
  );
};
