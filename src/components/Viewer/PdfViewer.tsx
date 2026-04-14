import React, { useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PageCanvas } from './PageCanvas';
import { AnnotationLayer } from '../Annotations/AnnotationLayer';
import type { Annotation, ToolType, DetectedField } from '../../types/annotations';

interface PdfViewerProps {
  pdfDoc: PDFDocumentProxy;
  totalPages: number;
  currentPage: number;
  scale: number;
  activeTool: ToolType;
  annotations: Annotation[];
  selectedId: string | null;
  detectedFields: DetectedField[];
  onSetCurrentPage: (page: number) => void;
  onAnnotationAdd: (type: Exclude<ToolType, 'select' | null>, pageIndex: number, rect: { x: number; y: number; width: number; height: number }) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationSelect: (id: string | null) => void;
  onFieldAccept: (fieldId: string) => void;
  onFieldDismiss: (fieldId: string) => void;
  onOpenSignaturePad: (pageIndex: number, rect: { x: number; y: number; width: number; height: number }) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  totalPages,
  scale,
  activeTool,
  annotations,
  selectedId,
  detectedFields,
  onSetCurrentPage,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationSelect,
  onFieldAccept,
  onFieldDismiss,
  onOpenSignaturePad,
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!viewerRef.current) return;
    const container = viewerRef.current;
    const pages = container.querySelectorAll('.page-container');
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestPage = 1;
    let closestDistance = Infinity;

    pages.forEach((pageEl) => {
      const pageRect = pageEl.getBoundingClientRect();
      const pageCenter = pageRect.top + pageRect.height / 2;
      const distance = Math.abs(pageCenter - containerCenter);
      const pageNum = parseInt(pageEl.getAttribute('data-page') || '1', 10);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNum;
      }
    });

    onSetCurrentPage(closestPage);
  }, [onSetCurrentPage]);

  return (
    <div className="viewer" ref={viewerRef} onScroll={handleScroll}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <PageCanvas
          key={pageNum}
          pdfDoc={pdfDoc}
          pageNumber={pageNum}
          scale={scale}
        >
          <AnnotationLayer
            pageIndex={pageNum - 1}
            scale={scale}
            activeTool={activeTool}
            annotations={annotations.filter((a) => a.pageIndex === pageNum - 1)}
            selectedId={selectedId}
            detectedFields={detectedFields.filter((f) => f.pageIndex === pageNum - 1 && !f.accepted)}
            onAnnotationAdd={onAnnotationAdd}
            onAnnotationUpdate={onAnnotationUpdate}
            onAnnotationSelect={onAnnotationSelect}
            onFieldAccept={onFieldAccept}
            onFieldDismiss={onFieldDismiss}
            onOpenSignaturePad={onOpenSignaturePad}
          />
        </PageCanvas>
      ))}
    </div>
  );
};
