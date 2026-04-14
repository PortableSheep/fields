import React from 'react';
import type { ToolType, Annotation } from '../../types/annotations';

interface MainToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onOpenFile: () => void;
  onSave: (flatten: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDetectFields: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasPdf: boolean;
  detecting: boolean;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selected: Annotation | null;
  onDeleteSelected: () => void;
  onUpdateSelected: (updates: Partial<Annotation>) => void;
}

export const MainToolbar: React.FC<MainToolbarProps> = ({
  activeTool,
  onToolChange,
  onOpenFile,
  onSave,
  onUndo,
  onRedo,
  onDetectFields,
  canUndo,
  canRedo,
  hasPdf,
  detecting,
  scale,
  onZoomIn,
  onZoomOut,
  selected,
  onDeleteSelected,
  onUpdateSelected,
}) => {
  return (
    <div className="toolbar">
      {/* File operations */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onOpenFile} title="Open PDF (Ctrl+O)">
          📂
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onSave(false)}
          disabled={!hasPdf}
          title="Save Editable (Ctrl+S)"
        >
          💾
        </button>
        <button
          className="toolbar-btn"
          onClick={() => onSave(true)}
          disabled={!hasPdf}
          title="Save Flattened (Ctrl+Shift+S)"
        >
          📋
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Zoom */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onZoomOut} disabled={!hasPdf} title="Zoom Out (-)">
          🔍−
        </button>
        <span style={{ fontSize: 12, minWidth: 45, textAlign: 'center', color: 'var(--text-secondary)' }}>
          {Math.round(scale * 100)}%
        </span>
        <button className="toolbar-btn" onClick={onZoomIn} disabled={!hasPdf} title="Zoom In (+)">
          🔍+
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Tools */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${activeTool === 'select' || !activeTool ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'select' ? null : 'select')}
          disabled={!hasPdf}
          title="Select (Esc)"
        >
          👆
        </button>
        <button
          className={`toolbar-btn ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'text' ? null : 'text')}
          disabled={!hasPdf}
          title="Text Tool (T)"
        >
          T
        </button>
        <button
          className={`toolbar-btn ${activeTool === 'checkbox' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'checkbox' ? null : 'checkbox')}
          disabled={!hasPdf}
          title="Checkbox Tool (C)"
        >
          ☑
        </button>
        <button
          className={`toolbar-btn ${activeTool === 'date' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'date' ? null : 'date')}
          disabled={!hasPdf}
          title="Date Tool (D)"
        >
          📅
        </button>
        <button
          className={`toolbar-btn ${activeTool === 'signature' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'signature' ? null : 'signature')}
          disabled={!hasPdf}
          title="Signature Tool (S)"
        >
          ✍️
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Detection */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onDetectFields}
          disabled={!hasPdf || detecting}
          title="Detect Fields"
          style={{ fontSize: 13, width: 'auto', padding: '0 10px' }}
        >
          {detecting ? '⏳' : '🔎'} Detect
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Edit operations */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button className="toolbar-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          ↪
        </button>
        <button
          className="toolbar-btn"
          onClick={onDeleteSelected}
          disabled={!selected}
          title="Delete Selected (Del)"
        >
          🗑
        </button>
      </div>

      {/* Style controls for selected text/date annotation */}
      {selected && (selected.type === 'text' || selected.type === 'date') && (
        <>
          <div className="toolbar-separator" />
          <div className="style-controls">
            <select
              value={(selected as any).fontFamily || 'sans-serif'}
              onChange={(e) => onUpdateSelected({ fontFamily: e.target.value } as any)}
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="handwriting">Handwriting</option>
            </select>
            <input
              type="number"
              min={8}
              max={72}
              value={(selected as any).fontSize || 14}
              onChange={(e) => onUpdateSelected({ fontSize: parseInt(e.target.value) || 14 } as any)}
              style={{ width: 50 }}
              title="Font Size"
            />
            <input
              type="color"
              value={(selected as any).color || '#000000'}
              onChange={(e) => onUpdateSelected({ color: e.target.value } as any)}
              title="Color"
            />
          </div>
        </>
      )}

      {/* Date format selector */}
      {selected && selected.type === 'date' && (
        <div className="style-controls">
          <select
            value={(selected as any).format || 'MM/DD/YYYY'}
            onChange={(e) => onUpdateSelected({ format: e.target.value } as any)}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      )}

      {/* Checkbox border toggle */}
      {selected && selected.type === 'checkbox' && (
        <>
          <div className="toolbar-separator" />
          <div className="style-controls">
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(selected as any).showBorder ?? true}
                onChange={(e) => onUpdateSelected({ showBorder: e.target.checked } as any)}
              />
              Border
            </label>
          </div>
        </>
      )}
    </div>
  );
};
