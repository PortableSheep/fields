import React from 'react';
import type { RecentFile } from '../../lib/storage';

interface EmptyStateProps {
  onOpenFile: () => void;
  recentFiles: RecentFile[];
  onOpenRecent: (path: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpenFile, recentFiles, onOpenRecent }) => {
  return (
    <div className="empty-state" onClick={onOpenFile}>
      <div className="empty-state-icon">📄</div>
      <div className="empty-state-text">No PDF loaded</div>
      <div className="empty-state-hint">
        Drag a PDF here or click to open a file
      </div>
      {recentFiles.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 16,
            background: 'var(--bg-surface)',
            borderRadius: 8,
            padding: '12px 16px',
            width: 360,
            maxWidth: '90%',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
            Recent Files
          </div>
          {recentFiles.map((f) => (
            <div
              key={f.path}
              onClick={() => onOpenRecent(f.path)}
              style={{
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title={f.path}
            >
              📄 {f.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
