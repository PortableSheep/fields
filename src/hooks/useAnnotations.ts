import { useState, useCallback, useRef } from 'react';
import type { Annotation, AnnotationType, Rect } from '../types/annotations';

let nextId = 1;

function generateId(): string {
  return `ann-${Date.now()}-${nextId++}`;
}

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const undoStackRef = useRef<Annotation[][]>([]);
  const redoStackRef = useRef<Annotation[][]>([]);

  const markClean = useCallback(() => setIsDirty(false), []);

  const pushUndo = useCallback((current: Annotation[]) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(current)));
    redoStackRef.current = [];
    setIsDirty(true);
  }, []);

  const addAnnotation = useCallback(
    (type: AnnotationType, pageIndex: number, rect: Rect, extra?: Partial<Annotation>) => {
      setAnnotations((prev) => {
        pushUndo(prev);
        const base = { id: generateId(), type, pageIndex, rect };
        let ann: Annotation;

        switch (type) {
          case 'text':
            ann = {
              ...base,
              type: 'text',
              value: '',
              fontSize: 14,
              fontFamily: 'sans-serif',
              color: '#000000',
              ...extra,
            } as Annotation;
            break;
          case 'checkbox':
            ann = {
              ...base,
              type: 'checkbox',
              checked: false,
              showBorder: true,
              ...extra,
            } as Annotation;
            break;
          case 'date':
            ann = {
              ...base,
              type: 'date',
              value: '',
              format: 'MM/DD/YYYY' as const,
              fontSize: 14,
              fontFamily: 'sans-serif',
              color: '#000000',
              ...extra,
            } as Annotation;
            break;
          case 'signature':
            ann = {
              ...base,
              type: 'signature',
              dataUrl: '',
              ...extra,
            } as Annotation;
            break;
          default:
            return prev;
        }

        setSelectedId(ann.id);
        return [...prev, ann];
      });
    },
    [pushUndo]
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      setAnnotations((prev) => {
        pushUndo(prev);
        return prev.map((a) => (a.id === id ? { ...a, ...updates } as Annotation : a));
      });
    },
    [pushUndo]
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      setAnnotations((prev) => {
        pushUndo(prev);
        return prev.filter((a) => a.id !== id);
      });
      setSelectedId((current) => (current === id ? null : current));
    },
    [pushUndo]
  );

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      deleteAnnotation(selectedId);
    }
  }, [selectedId, deleteAnnotation]);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    setAnnotations((prev) => {
      redoStackRef.current.push(JSON.parse(JSON.stringify(prev)));
      return stack.pop()!;
    });
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    setAnnotations((prev) => {
      undoStackRef.current.push(JSON.parse(JSON.stringify(prev)));
      return stack.pop()!;
    });
    setSelectedId(null);
  }, []);

  const replaceAnnotations = useCallback(
    (newAnnotations: Annotation[]) => {
      setAnnotations((prev) => {
        pushUndo(prev);
        return JSON.parse(JSON.stringify(newAnnotations));
      });
      setSelectedId(null);
    },
    [pushUndo]
  );

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const selected = annotations.find((a) => a.id === selectedId) || null;

  return {
    annotations,
    selectedId,
    selected,
    isDirty,
    setSelectedId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    deleteSelected,
    replaceAnnotations,
    markClean,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
