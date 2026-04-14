import React, { useCallback, useRef } from 'react';
import type { Annotation, ToolType, DetectedField, AnnotationType } from '../../types/annotations';
import { TextAnnotation } from './TextAnnotation';
import { CheckboxAnnotation } from './CheckboxAnnotation';
import { DateAnnotation } from './DateAnnotation';

interface AnnotationLayerProps {
  pageIndex: number;
  scale: number;
  activeTool: ToolType;
  annotations: Annotation[];
  selectedId: string | null;
  detectedFields: DetectedField[];
  onAnnotationAdd: (type: Exclude<ToolType, 'select' | null>, pageIndex: number, rect: { x: number; y: number; width: number; height: number }) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationSelect: (id: string | null) => void;
  onFieldAccept: (fieldId: string) => void;
  onFieldDismiss: (fieldId: string) => void;
  onOpenSignaturePad: (pageIndex: number, rect: { x: number; y: number; width: number; height: number }) => void;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  pageIndex,
  scale,
  activeTool,
  annotations,
  selectedId,
  detectedFields,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationSelect,
  onFieldAccept,
  onFieldDismiss,
  onOpenSignaturePad,
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handleLayerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!activeTool || activeTool === 'select') {
        onAnnotationSelect(null);
        return;
      }

      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      const defaultSizes: Record<AnnotationType, { w: number; h: number }> = {
        text: { w: 200, h: 24 },
        checkbox: { w: 20, h: 20 },
        date: { w: 120, h: 24 },
        signature: { w: 200, h: 80 },
      };

      const size = defaultSizes[activeTool] || { w: 150, h: 24 };

      if (activeTool === 'signature') {
        onOpenSignaturePad(pageIndex, { x, y, width: size.w, height: size.h });
      } else {
        onAnnotationAdd(activeTool, pageIndex, { x, y, width: size.w, height: size.h });
      }
    },
    [activeTool, pageIndex, scale, onAnnotationAdd, onAnnotationSelect, onOpenSignaturePad]
  );

  const handleAnnotationMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onAnnotationSelect(id);

      const ann = annotations.find((a) => a.id === id);
      if (!ann) return;

      let didMove = false;

      dragStateRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: ann.rect.x,
        origY: ann.rect.y,
      };

      const handleMove = (ev: MouseEvent) => {
        if (!dragStateRef.current) return;
        const dx = (ev.clientX - dragStateRef.current.startX) / scale;
        const dy = (ev.clientY - dragStateRef.current.startY) / scale;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didMove = true;
        onAnnotationUpdate(dragStateRef.current.id, {
          rect: {
            ...ann.rect,
            x: dragStateRef.current.origX + dx,
            y: dragStateRef.current.origY + dy,
          },
        });
      };

      const handleUp = () => {
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);

        if (didMove) {
          // Suppress the click that follows mouseup so annotations
          // don't toggle/activate when the user was dragging.
          const suppress = (ev: MouseEvent) => {
            ev.stopPropagation();
            ev.preventDefault();
          };
          window.addEventListener('click', suppress, { capture: true, once: true });
        }
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [annotations, scale, onAnnotationSelect, onAnnotationUpdate]
  );

  const handleFieldClick = useCallback(
    (e: React.MouseEvent, field: DetectedField) => {
      e.stopPropagation();
      onFieldAccept(field.id);
      onAnnotationAdd(field.fieldType, pageIndex, field.rect);
    },
    [pageIndex, onFieldAccept, onAnnotationAdd]
  );

  const handleFieldDismiss = useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      e.stopPropagation();
      e.preventDefault();
      onFieldDismiss(fieldId);
    },
    [onFieldDismiss]
  );

  const isInteractive = activeTool !== null;

  return (
    <div
      ref={layerRef}
      className={`annotation-layer ${isInteractive ? 'interactive' : ''}`}
      onClick={handleLayerClick}
    >
      {/* Detected field suggestions */}
      {detectedFields.map((field) => (
        <div
          key={field.id}
          className="detected-field"
          style={{
            left: field.rect.x * scale,
            top: field.rect.y * scale,
            width: field.rect.width * scale,
            height: field.rect.height * scale,
          }}
          onClick={(e) => handleFieldClick(e, field)}
          onContextMenu={(e) => handleFieldDismiss(e, field.id)}
          title={`${field.label} (${field.fieldType}) - Click to accept, right-click to dismiss`}
        >
          <span className="detected-field-label">{field.label}</span>
        </div>
      ))}

      {/* Rendered annotations */}
      {annotations.map((ann) => {
        const style: React.CSSProperties = {
          left: ann.rect.x * scale,
          top: ann.rect.y * scale,
          width: ann.rect.width * scale,
          height: ann.rect.height * scale,
        };

        const isSelected = ann.id === selectedId;

        switch (ann.type) {
          case 'text':
            return (
              <TextAnnotation
                key={ann.id}
                annotation={ann}
                scale={scale}
                isSelected={isSelected}
                style={style}
                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id)}
                onUpdate={(updates) => onAnnotationUpdate(ann.id, updates)}
              />
            );
          case 'checkbox':
            return (
              <CheckboxAnnotation
                key={ann.id}
                annotation={ann}
                scale={scale}
                isSelected={isSelected}
                style={style}
                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id)}
                onUpdate={(updates) => onAnnotationUpdate(ann.id, updates)}
              />
            );
          case 'date':
            return (
              <DateAnnotation
                key={ann.id}
                annotation={ann}
                scale={scale}
                isSelected={isSelected}
                style={style}
                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id)}
                onUpdate={(updates) => onAnnotationUpdate(ann.id, updates)}
              />
            );
          case 'signature':
            return (
              <div
                key={ann.id}
                className={`annotation-item ${isSelected ? 'selected' : ''}`}
                style={style}
                onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id)}
              >
                {ann.dataUrl && (
                  <img
                    src={ann.dataUrl}
                    alt="Signature"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    draggable={false}
                  />
                )}
                {isSelected && (
                  <>
                    <div className="resize-handle nw" />
                    <div className="resize-handle ne" />
                    <div className="resize-handle sw" />
                    <div className="resize-handle se" />
                  </>
                )}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};
