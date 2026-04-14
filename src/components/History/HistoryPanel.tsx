import React from 'react';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import type { Snapshot } from '../../lib/history';

interface HistoryPanelProps {
  snapshots: Snapshot[];
  loading: boolean;
  onRestore: (snapshot: Snapshot) => void;
  onClear: () => void;
  onClose: () => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative: string;
  if (diffMins < 1) relative = 'Just now';
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = date.toLocaleDateString();

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${relative} · ${time}`;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  snapshots,
  loading,
  onRestore,
  onClear,
  onClose,
}) => {
  const reversed = [...snapshots].reverse();

  return (
    <div className="history-panel">
      <div className="history-header">
        <span className="history-title">History</span>
        <div className="history-header-actions">
          {snapshots.length > 0 && (
            <button
              className="history-clear-btn"
              onClick={onClear}
              title="Clear all history"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
          <button className="history-close-btn" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="history-list">
        {loading && <div className="history-empty">Loading…</div>}
        {!loading && reversed.length === 0 && (
          <div className="history-empty">No history yet. Edits are auto-saved.</div>
        )}
        {!loading &&
          reversed.map((snap) => (
            <div key={snap.id} className="history-item">
              <div className="history-item-info">
                <div className="history-item-label">{snap.label}</div>
                <div className="history-item-time">{formatTimestamp(snap.timestamp)}</div>
              </div>
              <button
                className="history-restore-btn"
                onClick={() => onRestore(snap)}
                title="Restore this snapshot"
              >
                <RotateCcw size={12} /> Restore
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};
