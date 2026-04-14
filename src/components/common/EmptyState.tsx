import React from 'react';

interface EmptyStateProps {
  onOpenFile: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpenFile }) => {
  return (
    <div className="empty-state" onClick={onOpenFile}>
      <div className="empty-state-icon">📄</div>
      <div className="empty-state-text">No PDF loaded</div>
      <div className="empty-state-hint">
        Drag a PDF here or click to open a file
      </div>
    </div>
  );
};
