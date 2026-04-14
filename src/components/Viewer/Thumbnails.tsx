import React, { useEffect, useRef, useState } from 'react';
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
  const [thumbUrls, setThumbUrls] = useState<Map<number, string>>(new Map());

  // Render all thumbnails to offscreen canvases, then convert to data URLs.
  // This avoids canvas: null quirks and React ref-callback race conditions.
  useEffect(() => {
    let cancelled = false;
    setThumbUrls(new Map());

    const renderAll = async () => {
      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) break;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: THUMB_SCALE });
          const offscreen = document.createElement('canvas');
          offscreen.width = Math.floor(viewport.width);
          offscreen.height = Math.floor(viewport.height);
          const ctx = offscreen.getContext('2d');
          if (!ctx) continue;

          await page.render({
            canvasContext: ctx,
            canvas: offscreen,
            viewport,
          }).promise;

          if (cancelled) break;
          const url = offscreen.toDataURL();
          setThumbUrls((prev) => new Map(prev).set(i, url));
        } catch (err) {
          console.error(`Thumbnail render error page ${i}:`, err);
        }
      }
    };

    renderAll();
    return () => { cancelled = true; };
  }, [pdfDoc, totalPages]);

  return (
    <div className="sidebar" ref={containerRef}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          className={`thumbnail ${currentPage === pageNum ? 'active' : ''}`}
          onClick={() => onPageSelect(pageNum)}
        >
          {thumbUrls.has(pageNum) ? (
            <img
              src={thumbUrls.get(pageNum)}
              alt={`Page ${pageNum}`}
              draggable={false}
            />
          ) : (
            <div className="thumbnail-placeholder" />
          )}
          <div className="thumbnail-label">{pageNum}</div>
        </div>
      ))}
    </div>
  );
};
