import React from 'react';
import type { CheckboxAnnotation as CheckboxAnnotationType } from '../../types/annotations';

interface CheckboxAnnotationProps {
  annotation: CheckboxAnnotationType;
  scale: number;
  isSelected: boolean;
  style: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<CheckboxAnnotationType>) => void;
}

export const CheckboxAnnotation: React.FC<CheckboxAnnotationProps> = ({
  annotation,
  scale,
  isSelected,
  style,
  onMouseDown,
  onUpdate,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ checked: !annotation.checked });
  };

  return (
    <div
      className={`annotation-item ${isSelected ? 'selected' : ''}`}
      style={style}
      onMouseDown={onMouseDown}
    >
      <div
        className="checkbox-annotation"
        onClick={handleClick}
        style={{
          fontSize: Math.min(annotation.rect.width, annotation.rect.height) * scale * 0.7,
          color: annotation.checked ? '#000' : '#ccc',
          border: `${1 * scale}px solid #666`,
          borderRadius: 2 * scale,
        }}
      >
        {annotation.checked ? '✓' : ''}
      </div>
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
