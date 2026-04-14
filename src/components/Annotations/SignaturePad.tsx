import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { SavedSignature } from '../../lib/storage';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  savedSignatures: SavedSignature[];
  onDeleteSaved: (id: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onCancel,
  savedSignatures,
  onDeleteSaved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
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
  }, []);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    setHasContent(false);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    onSave(canvas.toDataURL('image/png'));
  }, [hasContent, onSave]);

  return (
    <div className="signature-overlay" onClick={onCancel}>
      <div
        className="signature-pad-container"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Draw your signature</h3>
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
            disabled={!hasContent}
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
