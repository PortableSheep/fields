import React, { useState, useRef, useEffect } from 'react';
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
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPicker && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.showPicker?.();
    }
  }, [showPicker]);

  const displayValue = formatDateDisplay(annotation.value, annotation.format);

  return (
    <div
      className={`annotation-item ${isSelected ? 'selected' : ''}`}
      style={style}
      onMouseDown={onMouseDown}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          fontSize: annotation.fontSize * scale,
          fontFamily: annotation.fontFamily,
          color: annotation.color,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(true);
        }}
      >
        {displayValue || 'Click to set date'}
      </div>
      {showPicker && (
        <div className="date-picker-popover" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="date"
            value={annotation.value}
            onChange={(e) => {
              onUpdate({ value: e.target.value });
              setShowPicker(false);
            }}
            onBlur={() => setTimeout(() => setShowPicker(false), 200)}
          />
        </div>
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
};
