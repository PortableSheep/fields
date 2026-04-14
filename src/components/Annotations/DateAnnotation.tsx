import React, { useRef, useCallback } from 'react';
import type { DateAnnotation as DateAnnotationType } from '../../types/annotations';

interface DateAnnotationProps {
  annotation: DateAnnotationType;
  scale: number;
  isSelected: boolean;
  style: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<DateAnnotationType>) => void;
}

function formatDateDisplay(value: string, format: string): string {
  if (!value) return '';
  const date = new Date(value + 'T00:00:00');
  if (isNaN(date.getTime())) return value;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  switch (format) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    default: return value;
  }
}

export const DateAnnotation: React.FC<DateAnnotationProps> = ({
  annotation,
  scale,
  isSelected,
  style,
  onMouseDown,
  onUpdate,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the native date picker
    inputRef.current?.showPicker?.();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ value: e.target.value });
  }, [onUpdate]);

  const displayValue = formatDateDisplay(annotation.value, annotation.format);

  return (
    <div
      className={`annotation-item ${isSelected ? 'selected' : ''}`}
      style={style}
      onMouseDown={onMouseDown}
    >
      <div
        className="date-annotation-display"
        style={{
          fontSize: annotation.fontSize * scale,
          fontFamily: annotation.fontFamily,
          color: annotation.color,
        }}
        onClick={handleClick}
      >
        {displayValue || 'Click to set date'}
      </div>
      {/* Hidden native date input — always in DOM to avoid mount/unmount crashes */}
      <input
        ref={inputRef}
        type="date"
        className="date-annotation-input"
        value={annotation.value}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
      />
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
};
