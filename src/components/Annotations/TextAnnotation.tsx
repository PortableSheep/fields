import React, { useRef, useEffect } from 'react';
import type { TextAnnotation as TextAnnotationType } from '../../types/annotations';

interface TextAnnotationProps {
  annotation: TextAnnotationType;
  scale: number;
  isSelected: boolean;
  style: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<TextAnnotationType>) => void;
}

export const TextAnnotation: React.FC<TextAnnotationProps> = ({
  annotation,
  scale,
  isSelected,
  style,
  onMouseDown,
  onUpdate,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  return (
    <div
      className={`annotation-item ${isSelected ? 'selected' : ''}`}
      style={style}
      onMouseDown={onMouseDown}
    >
      <textarea
        ref={inputRef}
        className="text-annotation-input"
        value={annotation.value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        style={{
          fontSize: annotation.fontSize * scale,
          fontFamily: annotation.fontFamily === 'handwriting'
            ? "'Caveat', 'Segoe Script', 'Comic Sans MS', cursive"
            : annotation.fontFamily,
          color: annotation.color,
        }}
        placeholder="Type here..."
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
