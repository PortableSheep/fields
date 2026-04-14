import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { SavedSignature } from '../../lib/storage';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  savedSignatures: SavedSignature[];
  onDeleteSaved: (id: string) => void;
}

type TabMode = 'draw' | 'type';

const SIGNATURE_FONTS = [
  { label: 'Script', value: "'Brush Script MT', 'Segoe Script', 'Apple Chancery', cursive" },
  { label: 'Elegant', value: "'Snell Roundhand', 'Edwardian Script ITC', 'Apple Chancery', cursive" },
  { label: 'Casual', value: "'Comic Sans MS', 'Marker Felt', cursive" },
  { label: 'Classic', value: "'Palatino', 'Book Antiqua', 'Georgia', serif" },
  { label: 'Formal', value: "'Times New Roman', 'Garamond', serif" },
];

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onCancel,
  savedSignatures,
  onDeleteSaved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [tab, setTab] = useState<TabMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].value);

  // Init draw canvas
  useEffect(() => {
    if (tab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tab]);

  // Render typed signature preview
  useEffect(() => {
    if (tab !== 'type') return;
    const canvas = typeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 450 * dpr;
    canvas.height = 150 * dpr;
    canvas.style.width = '450px';
    canvas.style.height = '150px';
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 450, 150);

    if (typedName.trim()) {
      // Size the font to fit the canvas width with padding
      let fontSize = 64;
      ctx.font = `${fontSize}px ${selectedFont}`;
      let measured = ctx.measureText(typedName);
      while (measured.width > 420 && fontSize > 16) {
        fontSize -= 2;
        ctx.font = `${fontSize}px ${selectedFont}`;
        measured = ctx.measureText(typedName);
      }

      ctx.fillStyle = '#1a1a2e';
      ctx.textBaseline = 'middle';
      const textX = (450 - measured.width) / 2;
      ctx.fillText(typedName, textX, 75);

      // Subtle underline
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 110);
      ctx.lineTo(420, 110);
      ctx.stroke();
    }
  }, [tab, typedName, selectedFont]);

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasContent(true);
    },
    [isDrawing, getPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      setHasContent(false);
    } else {
      setTypedName('');
    }
  }, [tab]);

  const handleSave = useCallback(() => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasContent) return;
      onSave(canvas.toDataURL('image/png'));
    } else {
      const canvas = typeCanvasRef.current;
      if (!canvas || !typedName.trim()) return;
      // Re-render at 1x for clean output
      const outCanvas = document.createElement('canvas');
      outCanvas.width = 450;
      outCanvas.height = 150;
      const ctx = outCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 450, 150);

      let fontSize = 64;
      ctx.font = `${fontSize}px ${selectedFont}`;
      let measured = ctx.measureText(typedName);
      while (measured.width > 420 && fontSize > 16) {
        fontSize -= 2;
        ctx.font = `${fontSize}px ${selectedFont}`;
        measured = ctx.measureText(typedName);
      }
      ctx.fillStyle = '#1a1a2e';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, (450 - measured.width) / 2, 75);

      onSave(outCanvas.toDataURL('image/png'));
    }
  }, [tab, hasContent, typedName, selectedFont, onSave]);

  const canApply = tab === 'draw' ? hasContent : typedName.trim().length > 0;

  return (
    <div className="signature-overlay" onClick={onCancel}>
      <div
        className="signature-pad-container"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Add Signature</h3>

        {/* Tab switcher */}
        <div className="signature-tabs">
          <button
            className={`signature-tab ${tab === 'draw' ? 'active' : ''}`}
            onClick={() => setTab('draw')}
          >
            ✏️ Draw
          </button>
          <button
            className={`signature-tab ${tab === 'type' ? 'active' : ''}`}
            onClick={() => setTab('type')}
          >
            ⌨️ Type
          </button>
        </div>

        {tab === 'draw' ? (
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            width={450}
            height={150}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        ) : (
          <div className="signature-type-area">
            <input
              type="text"
              className="signature-type-input"
              placeholder="Type your name..."
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoFocus
            />
            <div className="signature-font-picker">
              {SIGNATURE_FONTS.map((font) => (
                <button
                  key={font.label}
                  className={`signature-font-btn ${selectedFont === font.value ? 'active' : ''}`}
                  onClick={() => setSelectedFont(font.value)}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
            <canvas
              ref={typeCanvasRef}
              className="signature-canvas"
              style={{ cursor: 'default' }}
            />
          </div>
        )}

        <div className="signature-actions">
          <button className="btn btn-secondary" onClick={handleClear}>
            Clear
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!canApply}
          >
            Apply Signature
          </button>
        </div>

        {savedSignatures.length > 0 && (
          <div>
            <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Saved Signatures
            </h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {savedSignatures.map((sig) => (
                <div
                  key={sig.id}
                  style={{
                    position: 'relative',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    padding: 4,
                    cursor: 'pointer',
                    background: 'white',
                  }}
                  onClick={() => onSave(sig.dataUrl)}
                  title={`Use ${sig.label}`}
                >
                  <img
                    src={sig.dataUrl}
                    alt={sig.label}
                    style={{ height: 40, width: 'auto', display: 'block' }}
                    draggable={false}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSaved(sig.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'var(--danger)',
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete saved signature"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
