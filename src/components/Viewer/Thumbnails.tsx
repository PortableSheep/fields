import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface ThumbnailsProps {
  pdfDoc: PDFDocumentProxy;
  totalPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}

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
        const viewport = page.getViewport({ scale: 0.3 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
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
